import { BooleanOption, StringOption } from 'necord';

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

export class QuoteListOptions extends QuoteAuthorOptions {
  @BooleanOption({
    name: 'ephemeral',
    description: 'Show the list only to you (default: true)',
    required: false,
  })
  ephemeral?: boolean | null;
}
