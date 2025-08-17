import { IntegerOption } from 'necord';

export class DayOfMonthOption {
  @IntegerOption({
    name: 'day',
    description: 'Day of the month',
    required: true,
    min_value: 1,
    max_value: 31,
  })
  day: number;
}
