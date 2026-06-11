import { NumberOption } from 'necord';

export class ContextSizeOption {
  @NumberOption({
    name: 'size',
    description: 'Number of messages to include in context',
    required: true,
    min_value: 1,
    max_value: 100,
  })
  public size: number;
}
