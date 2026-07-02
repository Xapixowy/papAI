import { MealType } from '@Enums/fit-coach/meal-type.enum';

export class MealTypeDecorator {
  static labels: Record<MealType, string> = {
    [MealType.BREAKFAST]: 'Breakfast',
    [MealType.SECOND_BREAKFAST]: 'Second Breakfast',
    [MealType.LUNCH]: 'Lunch',
    [MealType.AFTERNOON_SNACK]: 'Afternoon Snack',
    [MealType.DINNER]: 'Dinner',
    [MealType.SNACK]: 'Snack',
  };

  static emojis: Record<MealType, string> = {
    [MealType.BREAKFAST]: '🌅',
    [MealType.SECOND_BREAKFAST]: '☕',
    [MealType.LUNCH]: '☀️',
    [MealType.AFTERNOON_SNACK]: '🍎',
    [MealType.DINNER]: '🌙',
    [MealType.SNACK]: '🍿',
  };

  static decorate(type: MealType): string {
    return `${this.emojis[type]} ${this.labels[type]}`;
  }
}
