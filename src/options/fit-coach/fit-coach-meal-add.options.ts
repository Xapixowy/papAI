import { MealType } from '@Enums/fit-coach/meal-type.enum';
import { IntegerOption, NumberOption, StringOption } from 'necord';

export class FitCoachMealAddOptions {
  @StringOption({
    name: 'name',
    description: 'Meal name (e.g. "Oatmeal with banana")',
    required: true,
  })
  name: string;

  @IntegerOption({
    name: 'calories',
    description: 'Total calories (kcal) — AI estimates if omitted',
    required: false,
    min_value: 1,
  })
  calories?: number;

  @NumberOption({
    name: 'protein',
    description: 'Protein (grams) — AI estimates if omitted',
    required: false,
    min_value: 0,
  })
  protein?: number;

  @NumberOption({
    name: 'fat',
    description: 'Fat (grams) — AI estimates if omitted',
    required: false,
    min_value: 0,
  })
  fat?: number;

  @NumberOption({
    name: 'carbs',
    description: 'Carbohydrates (grams) — AI estimates if omitted',
    required: false,
    min_value: 0,
  })
  carbs?: number;

  @StringOption({
    name: 'meal_type',
    description: 'Meal type (auto-detected from time if omitted)',
    required: false,
    choices: Object.values(MealType).map((v) => ({
      name: v.replace(/_/g, ' '),
      value: v,
    })),
  })
  mealType?: MealType;

  @StringOption({
    name: 'date',
    description: 'Date in YYYY-MM-DD format (defaults to today)',
    required: false,
  })
  date?: string;

  @StringOption({
    name: 'time',
    description: 'Time in HH:MM format (defaults to now)',
    required: false,
  })
  time?: string;
}
