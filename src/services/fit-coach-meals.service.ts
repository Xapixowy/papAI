import { FitCoachMeal } from '@Entities/fit-coach-meal.entity';
import { FitCoachMealDto } from '@DTOs/fit-coach-meal.dto';
import { MealType } from '@Enums/fit-coach/meal-type.enum';
import { ErrorCode } from '@Enums/error-code.enum';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { err, ok, Result } from 'neverthrow';
import { Between, Repository } from 'typeorm';

@Injectable()
export class FitCoachMealsService {
  constructor(
    @InjectRepository(FitCoachMeal)
    private readonly mealsRepository: Repository<FitCoachMeal>,
  ) {}

  async create(dto: FitCoachMealDto): Promise<Result<FitCoachMeal, ErrorCode>> {
    const entity = this.mealsRepository.create({
      discordUserId: dto.discordUserId,
      mealType: dto.mealType,
      name: dto.name,
      calories: dto.calories,
      protein: dto.protein,
      fat: dto.fat,
      carbs: dto.carbs,
      mealAt: dto.mealAt,
      breakdown: dto.breakdown ?? null,
      portionGrams: dto.portionGrams ?? null,
    });
    const saved = await this.mealsRepository.save(entity);
    return ok(saved);
  }

  async findById(id: string): Promise<Result<FitCoachMeal, ErrorCode>> {
    const entity = await this.mealsRepository.findOne({ where: { id } });
    return entity ? ok(entity) : err(ErrorCode.FIT_COACH_MEAL_NOT_FOUND);
  }

  async deleteById(
    id: string,
    discordUserId: string,
  ): Promise<Result<void, ErrorCode>> {
    const result = await this.mealsRepository.delete({ id, discordUserId });
    return result.affected && result.affected > 0
      ? ok(undefined)
      : err(ErrorCode.FIT_COACH_MEAL_NOT_FOUND);
  }

  async findByUserAndDay(
    discordUserId: string,
    date: Date,
    timezone: string,
  ): Promise<FitCoachMeal[]> {
    const { start, end } = this.getDayBoundsInUtc(date, timezone);
    return this.mealsRepository.find({
      where: {
        discordUserId,
        mealAt: Between(start, end),
      },
      order: { mealAt: 'ASC' },
    });
  }

  async getSummaryForPeriod(
    discordUserId: string,
    from: Date,
    to: Date,
  ): Promise<{
    totalCalories: number;
    totalProtein: number;
    totalFat: number;
    totalCarbs: number;
    totalGrams: number;
    mealCount: number;
  }> {
    const result = await this.mealsRepository
      .createQueryBuilder('meal')
      .select('SUM(meal.calories)', 'totalCalories')
      .addSelect('SUM(meal.protein)', 'totalProtein')
      .addSelect('SUM(meal.fat)', 'totalFat')
      .addSelect('SUM(meal.carbs)', 'totalCarbs')
      .addSelect('COALESCE(SUM(meal.portionGrams), 0)', 'totalGrams')
      .addSelect('COUNT(*)', 'mealCount')
      .where('meal.discordUserId = :discordUserId', { discordUserId })
      .andWhere('meal.mealAt >= :from', { from })
      .andWhere('meal.mealAt <= :to', { to })
      .getRawOne<{
        totalCalories: string;
        totalProtein: string;
        totalFat: string;
        totalCarbs: string;
        totalGrams: string;
        mealCount: string;
      }>();

    return {
      totalCalories: parseFloat(result?.totalCalories ?? '0'),
      totalProtein: parseFloat(result?.totalProtein ?? '0'),
      totalFat: parseFloat(result?.totalFat ?? '0'),
      totalCarbs: parseFloat(result?.totalCarbs ?? '0'),
      totalGrams: parseFloat(result?.totalGrams ?? '0'),
      mealCount: parseInt(result?.mealCount ?? '0', 10),
    };
  }

  async findByUserAndMealType(
    discordUserId: string,
    mealType: MealType,
    date: Date,
    timezone: string,
  ): Promise<FitCoachMeal[]> {
    const { start, end } = this.getDayBoundsInUtc(date, timezone);
    return this.mealsRepository.find({
      where: {
        discordUserId,
        mealType,
        mealAt: Between(start, end),
      },
      order: { mealAt: 'ASC' },
    });
  }

  private getDayBoundsInUtc(
    date: Date,
    timezone: string,
  ): { start: Date; end: Date } {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const localDateStr = formatter.format(date);

    const startLocal = new Date(`${localDateStr}T00:00:00`);
    const endLocal = new Date(`${localDateStr}T23:59:59.999`);

    const offsetMs =
      date.getTime() -
      new Date(date.toLocaleString('en-US', { timeZone: timezone })).getTime();

    return {
      start: new Date(startLocal.getTime() + offsetMs),
      end: new Date(endLocal.getTime() + offsetMs),
    };
  }
}
