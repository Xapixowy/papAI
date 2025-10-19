import { StringOption } from 'necord';

export class QueryOption {
  @StringOption({
    name: 'query',
    description: 'Query',
    required: true,
  })
  query: string;
}
