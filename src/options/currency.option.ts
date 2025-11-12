import { CurrencyCode } from '@Enums/currency-code.enum';
import { StringOption } from 'necord';

export class CurrencyOption {
  @StringOption({
    name: 'currency',
    description: 'Currency',
    required: true,
    choices: Object.values(CurrencyCode).map((currencyCode) => ({
      name: currencyCode,
      value: currencyCode,
    })),
  })
  currency: CurrencyCode;
}
