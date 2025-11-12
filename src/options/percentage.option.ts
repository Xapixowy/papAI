import { NumberOption } from 'necord';

export class PercentageOption {
  @NumberOption({
    name: 'percentage',
    description: 'Percentage',
    required: true,
    min_value: 0,
    max_value: 100,
  })
  public percentage: number;
}
