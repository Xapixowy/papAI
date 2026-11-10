import { isAxiosError } from 'axios';
import { ZodError } from 'zod';
import { WowSourceError } from '@Types/wow/wow.type';

const compact = (value: string) => value.replace(/\s+/g, ' ').slice(0, 400);

/** Keep diagnostic causes, without logging HTTP headers, bodies or URL secrets. */
export function wowErrorDetails(error: unknown): string {
  const parts: string[] = [];
  const seen = new Set<unknown>();
  let current = error;
  for (let depth = 0; current !== undefined && depth < 5; depth++) {
    if (seen.has(current)) break;
    seen.add(current);
    if (isAxiosError(current)) {
      let endpoint = 'unknown';
      try {
        const url = new URL(current.config?.url ?? '', current.config?.baseURL);
        endpoint = `${url.origin}${url.pathname}`;
      } catch {
        // An invalid URL must not hide the original error or expose raw input.
      }
      parts.push(
        `HTTP status=${current.response?.status ?? 'none'} code=${current.code ?? 'unknown'} method=${current.config?.method?.toUpperCase() ?? 'unknown'} endpoint=${endpoint}`,
      );
    } else if (current instanceof ZodError) {
      parts.push(
        `Schema validation: ${current.issues
          .slice(0, 8)
          .map((issue) => `${issue.path.map(String).join('.')}: ${issue.code}`)
          .join(', ')}`,
      );
    } else if (current instanceof SyntaxError) {
      parts.push('SyntaxError: Invalid source JSON');
    } else if (current instanceof Error) {
      parts.push(`${current.name}: ${compact(current.message)}`);
      if (current instanceof WowSourceError && current.context)
        parts.push(current.context);
    } else {
      parts.push(
        typeof current === 'string' ? compact(current) : 'Unknown error',
      );
    }
    current = current instanceof Error ? current.cause : undefined;
  }
  return parts.map(compact).join(' | ').slice(0, 2000);
}
