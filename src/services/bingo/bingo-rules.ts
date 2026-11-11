import { randomInt } from 'node:crypto';
import type { BingoCell } from '@Database/entities/bingo.entity';

export class BingoError extends Error {}

export function requireBingo(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) throw new BingoError(message);
}

export function bingoId(value: string): string {
  requireBingo(
    /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(value),
    'Choose a valid ID from the bingo catalog.',
  );
  return value;
}

export function bingoText(value: string, label = 'Phrase'): string {
  const text = value.normalize('NFC').trim().replace(/\s+/gu, ' ');
  requireBingo(
    [...text].length >= 1 && [...text].length <= 80,
    `${label} must contain 1–80 characters.`,
  );
  requireBingo(
    !/[\p{Cc}\p{Cf}]/u.test(text),
    `${label} cannot contain control characters.`,
  );
  return text;
}

export function normalizePhrase(text: string): string {
  return bingoText(text).toLowerCase();
}

export function bingoLabel(text: string, maximum = 100): string {
  return text.slice(0, maximum).replace(/[\uD800-\uDBFF]$/, '');
}

export function cellLabel(index: number, size: number): string {
  return `${String.fromCharCode(65 + Math.floor(index / size))}${(index % size) + 1}`;
}

export function completedLines(cells: BingoCell[], size: number): number[][] {
  const lines: number[][] = [];
  for (let n = 0; n < size; n++) {
    lines.push(Array.from({ length: size }, (_, i) => n * size + i));
    lines.push(Array.from({ length: size }, (_, i) => i * size + n));
  }
  lines.push(Array.from({ length: size }, (_, i) => i * size + i));
  lines.push(Array.from({ length: size }, (_, i) => i * size + size - 1 - i));
  return lines.filter((line) => line.every((i) => !!cells[i]?.markedBy));
}

export function drawPhrases<T>(phrases: T[], count: number): T[] {
  requireBingo(
    phrases.length >= count,
    `Add ${count - phrases.length} more phrase(s) before starting this board.`,
  );
  const shuffled = [...phrases];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

/** Log diagnostic codes and stack frames, never Discord payloads, tokens, or SQL parameters. */
export function bingoErrorDetails(error: unknown): string {
  const parts: string[] = [];
  const seen = new Set<unknown>();
  for (
    let current = error, n = 0;
    current && n < 4 && !seen.has(current);
    n++
  ) {
    seen.add(current);
    if (!(current instanceof Error)) {
      parts.push('Unknown error');
      break;
    }
    const diagnostic = current as Error & {
      code?: unknown;
      status?: unknown;
      driverError?: unknown;
    };
    const safe = (value: unknown) =>
      typeof value === 'number' ||
      (typeof value === 'string' && /^[A-Za-z0-9_-]{1,50}$/.test(value))
        ? String(value)
        : 'unknown';
    parts.push(
      `${current.name} code=${safe(diagnostic.code)} status=${safe(diagnostic.status)}${current instanceof BingoError ? `: ${current.message}` : ''}`,
    );
    parts.push(
      ...(current.stack
        ?.split('\n')
        .filter((line) => /^\s+at /.test(line))
        .slice(0, 5) ?? []),
    );
    current = current.cause ?? diagnostic.driverError;
  }
  return parts.join('\n').slice(0, 3000);
}
