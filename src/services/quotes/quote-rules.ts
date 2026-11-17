import { createHash } from 'node:crypto';

export class QuoteError extends Error {}

export function requireQuote(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) throw new QuoteError(message);
}

export function normalizedQuoteText(value: string): string {
  return value.normalize('NFC').trim().replace(/\s+/gu, ' ').toLowerCase();
}

export function quoteAuthorFilter(author?: string | null): string | undefined {
  if (author == null) return undefined;
  const normalized = normalizedQuoteText(author);
  requireQuote(
    normalized.length > 0 && author.length <= 100 && !/\p{Cc}/u.test(author),
    'Author must contain 1–100 characters without control characters.',
  );
  return normalized;
}

export function quoteInput(author: string, content: string) {
  author = author.normalize('NFC').trim();
  content = content.normalize('NFC').replace(/\r\n?/g, '\n').trim();
  requireQuote(
    author.length >= 1 && author.length <= 100,
    'Author must contain 1–100 characters.',
  );
  requireQuote(
    content.length >= 1 && content.length <= 2000,
    'Quote content must contain 1–2000 characters.',
  );
  requireQuote(
    !/\p{Cc}/u.test(author),
    'Author cannot contain control characters or line breaks.',
  );
  requireQuote(
    !/\p{Cc}/u.test(content.replace(/[\n\t]/g, '')),
    'Quote content cannot contain control characters other than tabs and line breaks.',
  );
  const normalizedAuthor = normalizedQuoteText(author);
  return {
    author,
    content,
    normalizedAuthor,
    fingerprint: createHash('sha256')
      .update(JSON.stringify([normalizedAuthor, normalizedQuoteText(content)]))
      .digest('hex'),
  };
}

export function quoteId(id: string): string {
  requireQuote(
    /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(id),
    'This quote is no longer available. Run the command again.',
  );
  return id;
}
