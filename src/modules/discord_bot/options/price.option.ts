import { NumberOption } from 'necord';

export class PriceOption {
  @NumberOption({
    name: 'price',
    description: 'Price',
    required: true,
    min_value: 0.01,
  })
  price: string;
}
