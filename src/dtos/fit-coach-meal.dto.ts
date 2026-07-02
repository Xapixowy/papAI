import { FitCoachMeal } from '@Entities/fit-coach-meal.entity';
import { MealType } from '@Enums/fit-coach/meal-type.enum';
import type { PendingMealBreakdownItem } from '@Types/fit-coach/pending-meal.type';

export class FitCoachMealDto {
  id?: string;
  discordUserId: string;
  mealType: MealType;
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  mealAt: Date;
  breakdown?: PendingMealBreakdownItem[] | null;
  portionGrams?: number | null;
  createdAt?: Date;

  constructor(data: FitCoachMealDto) {
    Object.assign(this, data);
  }

  static fromEntity(entity: FitCoachMeal): FitCoachMealDto {
    return new FitCoachMealDto({
      id: entity.id,
      discordUserId: entity.discordUserId,
      mealType: entity.mealType,
      name: entity.name,
      calories: entity.calories,
      protein: entity.protein,
      fat: entity.fat,
      carbs: entity.carbs,
      mealAt: entity.mealAt,
      breakdown: entity.breakdown,
      portionGrams: entity.portionGrams,
      createdAt: entity.createdAt,
    });
  }
}
