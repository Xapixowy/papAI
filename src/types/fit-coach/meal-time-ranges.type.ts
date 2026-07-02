import type { MealType } from '@Enums/fit-coach/meal-type.enum';

export type MealTimeRange = {
  start: string;
  end: string;
};

export type MealTimeRanges = Record<MealType, MealTimeRange>;
