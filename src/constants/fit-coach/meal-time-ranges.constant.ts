import { MealType } from '@Enums/fit-coach/meal-type.enum';
import { MealTimeRanges } from '@Types/fit-coach/meal-time-ranges.type';

export const DEFAULT_MEAL_TIME_RANGES: MealTimeRanges = {
  [MealType.BREAKFAST]: { start: '06:00', end: '10:00' },
  [MealType.SECOND_BREAKFAST]: { start: '10:00', end: '12:00' },
  [MealType.LUNCH]: { start: '12:00', end: '15:00' },
  [MealType.AFTERNOON_SNACK]: { start: '15:00', end: '17:00' },
  [MealType.DINNER]: { start: '17:00', end: '21:00' },
  [MealType.SNACK]: { start: '21:00', end: '06:00' },
};
