import { StringOption } from 'necord';

export class FitCoachMealListOptions {
  @StringOption({
    name: 'date',
    description: 'Date in YYYY-MM-DD format (defaults to today)',
    required: false,
  })
  date?: string;
}
