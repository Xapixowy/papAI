import { EnvKey } from '@Enums/env-key.enum';
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  NutritionLookupResult,
  NutritionPer100g,
} from '@Types/fit-coach/nutrition-lookup.type';
import { firstValueFrom } from 'rxjs';

const OFF_SEARCH_URL = 'https://world.openfoodfacts.org/cgi/search.pl';
const USDA_SEARCH_URL = 'https://api.nal.usda.gov/fdc/v1/foods/search';

const OFF_CIRCUIT_BREAKER_TTL_MS = 5 * 60 * 1000;
const USDA_CIRCUIT_BREAKER_TTL_MS = 2 * 60 * 1000;

@Injectable()
export class NutritionLookupService {
  private readonly logger = new Logger(NutritionLookupService.name);
  private readonly usdaApiKey: string;
  private offCircuitOpenAt: number | null = null;
  private usdaCircuitOpenAt: number | null = null;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.usdaApiKey =
      configService.get<string>(EnvKey.USDA_API_KEY) ?? 'DEMO_KEY';
  }

  private isOffCircuitOpen(): boolean {
    if (this.offCircuitOpenAt === null) return false;
    if (Date.now() - this.offCircuitOpenAt > OFF_CIRCUIT_BREAKER_TTL_MS) {
      this.offCircuitOpenAt = null;
      return false;
    }
    return true;
  }

  private isUsdaCircuitOpen(): boolean {
    if (this.usdaCircuitOpenAt === null) return false;
    if (Date.now() - this.usdaCircuitOpenAt > USDA_CIRCUIT_BREAKER_TTL_MS) {
      this.usdaCircuitOpenAt = null;
      return false;
    }
    return true;
  }

  async lookup(
    query: string,
    portionGrams: number,
  ): Promise<NutritionLookupResult | null> {
    query = query.toUpperCase();

    const offPromise = this.isOffCircuitOpen()
      ? Promise.resolve(null)
      : this.queryOpenFoodFacts(query);

    const usdaPromise = this.isUsdaCircuitOpen()
      ? Promise.resolve(null)
      : this.queryUSDA(query);

    const [offResult, usdaResult] = await Promise.allSettled([
      offPromise,
      usdaPromise,
    ]);

    const results: NutritionPer100g[] = [];
    const sources: string[] = [];
    let bestName = query;

    if (offResult.status === 'fulfilled' && offResult.value) {
      results.push(offResult.value.nutrition);
      sources.push('Open Food Facts');
      bestName = offResult.value.name || bestName;
    }

    if (usdaResult.status === 'fulfilled' && usdaResult.value) {
      results.push(usdaResult.value.nutrition);
      sources.push('USDA FoodData Central');
      if (bestName === query) bestName = usdaResult.value.name || bestName;
    }

    if (results.length === 0) {
      this.logger.debug(`No results for "${query}"`);
      return null;
    }

    const per100g = this.average(results);
    const perPortion = this.scale(per100g, portionGrams);

    this.logger.debug(
      `"${query}" ${portionGrams}g → ${perPortion.calories} kcal (${sources.join(', ')}) [matched: "${bestName}"]`,
    );

    return {
      name: bestName.toUpperCase(),
      per100g,
      portionGrams,
      perPortion,
      sources,
    };
  }

  async lookupBatch(
    components: Array<{ query: string; portion_grams: number }>,
  ): Promise<{
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    sources: string[];
    found: number;
    total: number;
    components: Array<{
      query: string;
      name: string;
      portionGrams: number;
      calories: number;
      protein: number;
      fat: number;
      carbs: number;
      found: boolean;
    }>;
  }> {
    this.logger.debug(
      `Batch lookup: ${components.map((c) => `"${c.query}" ${c.portion_grams}g`).join(', ')}`,
    );

    const results = await Promise.all(
      components.map((c) => this.lookup(c.query, c.portion_grams)),
    );

    const allSources = new Set<string>();
    let calories = 0;
    let protein = 0;
    let fat = 0;
    let carbs = 0;
    let found = 0;

    const componentBreakdown = components.map((c, i) => {
      const r = results[i];
      if (r) {
        calories += r.perPortion.calories;
        protein += r.perPortion.protein;
        fat += r.perPortion.fat;
        carbs += r.perPortion.carbs;
        r.sources.forEach((s) => allSources.add(s));
        found++;
        return {
          query: c.query,
          name: r.name,
          portionGrams: c.portion_grams,
          calories: r.perPortion.calories,
          protein: r.perPortion.protein,
          fat: r.perPortion.fat,
          carbs: r.perPortion.carbs,
          found: true,
        };
      }
      return {
        query: c.query,
        name: c.query.toUpperCase(),
        portionGrams: c.portion_grams,
        calories: 0,
        protein: 0,
        fat: 0,
        carbs: 0,
        found: false,
      };
    });

    return {
      calories: Math.round(calories),
      protein: Math.round(protein * 10) / 10,
      fat: Math.round(fat * 10) / 10,
      carbs: Math.round(carbs * 10) / 10,
      sources: [...allSources],
      found,
      total: components.length,
      components: componentBreakdown,
    };
  }

  private async queryOpenFoodFacts(
    query: string,
  ): Promise<{ name: string; nutrition: NutritionPer100g } | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<OffSearchResponse>(OFF_SEARCH_URL, {
          params: {
            search_terms: query,
            search_simple: 1,
            action: 'process',
            json: 1,
            fields: 'product_name,nutriments',
            page_size: 5,
          },
          timeout: 5000,
        }),
      );

      const products = response.data?.products ?? [];

      for (const product of products) {
        const n = product?.nutriments;
        if (!n) continue;

        const calories =
          (n['energy-kcal_100g'] as number | undefined) ??
          (n['energy-kcal'] as number | undefined);
        const protein = n['proteins_100g'] as number | undefined;
        const fat = n['fat_100g'] as number | undefined;
        const carbs = n['carbohydrates_100g'] as number | undefined;

        if (calories == null || protein == null || fat == null || carbs == null)
          continue;

        return {
          name: (product.product_name as string) || query,
          nutrition: {
            calories: Math.round(calories),
            protein: Math.round(protein * 10) / 10,
            fat: Math.round(fat * 10) / 10,
            carbs: Math.round(carbs * 10) / 10,
          },
        };
      }

      return null;
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response
        ?.status;
      if (status === 503 || status === 429) {
        if (!this.offCircuitOpenAt) {
          this.logger.warn(
            `Open Food Facts returned ${status} — circuit open for ${OFF_CIRCUIT_BREAKER_TTL_MS / 60000} min`,
          );
          this.offCircuitOpenAt = Date.now();
        }
      } else {
        this.logger.warn(
          `Open Food Facts lookup failed for "${query}": ${error}`,
        );
      }
      return null;
    }
  }

  private async queryUSDA(
    query: string,
  ): Promise<{ name: string; nutrition: NutritionPer100g } | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<UsdaSearchResponse>(USDA_SEARCH_URL, {
          params: {
            query,
            api_key: this.usdaApiKey,
            pageSize: 5,
            dataType: 'Foundation,SR Legacy,Branded',
          },
          timeout: 5000,
        }),
      );

      const foods = response.data?.foods ?? [];

      for (const food of foods) {
        const nutrients = food?.foodNutrients ?? [];
        const get = (id: number) =>
          nutrients.find((n) => n.nutrientId === id)?.value;

        const calories = get(1008);
        const protein = get(1003);
        const fat = get(1004);
        const carbs = get(1005);

        if (calories == null || protein == null || fat == null || carbs == null)
          continue;

        return {
          name: food.description || query,
          nutrition: {
            calories: Math.round(calories),
            protein: Math.round(protein * 10) / 10,
            fat: Math.round(fat * 10) / 10,
            carbs: Math.round(carbs * 10) / 10,
          },
        };
      }

      return null;
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response
        ?.status;
      if (status === 429) {
        if (!this.usdaCircuitOpenAt) {
          this.logger.warn(
            `USDA rate limited — circuit open for ${USDA_CIRCUIT_BREAKER_TTL_MS / 60000} min. Get a free API key at https://fdc.nal.usda.gov/api-key-signup`,
          );
          this.usdaCircuitOpenAt = Date.now();
        }
      } else {
        this.logger.warn(`USDA lookup failed for "${query}": ${error}`);
      }
      return null;
    }
  }

  private average(results: NutritionPer100g[]): NutritionPer100g {
    const n = results.length;
    return {
      calories: Math.round(results.reduce((s, r) => s + r.calories, 0) / n),
      protein:
        Math.round((results.reduce((s, r) => s + r.protein, 0) / n) * 10) / 10,
      fat: Math.round((results.reduce((s, r) => s + r.fat, 0) / n) * 10) / 10,
      carbs:
        Math.round((results.reduce((s, r) => s + r.carbs, 0) / n) * 10) / 10,
    };
  }

  private scale(per100g: NutritionPer100g, grams: number): NutritionPer100g {
    const f = grams / 100;
    return {
      calories: Math.round(per100g.calories * f),
      protein: Math.round(per100g.protein * f * 10) / 10,
      fat: Math.round(per100g.fat * f * 10) / 10,
      carbs: Math.round(per100g.carbs * f * 10) / 10,
    };
  }
}

type OffSearchResponse = {
  products: Array<{
    product_name?: string;
    nutriments?: Record<string, number>;
  }>;
};

type UsdaSearchResponse = {
  foods: Array<{
    description: string;
    foodNutrients: Array<{ nutrientId: number; value: number }>;
  }>;
};
