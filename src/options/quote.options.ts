import { StringOption } from 'necord';

export class QuoteAuthorOptions {
  @StringOption({
    name: 'author',
    description: 'Only include quotes attributed to this author',
    required: false,
    min_length: 1,
    max_length: 100,
  })
  author?: string | null;
}
