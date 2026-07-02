import type { MealType } from '@Enums/fit-coach/meal-type.enum';

export type PendingMealBreakdownItem = {
  name: string;
  portionGrams: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  found: boolean;
  estimated?: boolean;
};

export type PendingMeal = {
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  mealType: MealType;
  mealAt: string;
  mealAtLocal: string;
  breakdown?: PendingMealBreakdownItem[];
};
