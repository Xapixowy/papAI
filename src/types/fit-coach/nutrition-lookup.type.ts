export type NutritionPer100g = {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
};

export type NutritionLookupResult = {
  name: string;
  per100g: NutritionPer100g;
  portionGrams: number;
  perPortion: NutritionPer100g;
  sources: string[];
};
