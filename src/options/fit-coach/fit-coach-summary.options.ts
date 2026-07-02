import { StringOption } from 'necord';

export class FitCoachSummaryOptions {
  @StringOption({
    name: 'date',
    description: 'Reference date in YYYY-MM-DD format (defaults to today)',
    required: false,
  })
  date?: string;
}
