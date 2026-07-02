import { StringOption } from 'necord';

export class FitCoachMealRemoveOptions {
  @StringOption({
    name: 'date',
    description: 'Date in YYYY-MM-DD format (defaults to today)',
    required: false,
  })
  date?: string;
}
