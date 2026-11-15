import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { WowSourceError } from '@Types/wow/wow.type';
import { WowPatchNotesEntry } from '@Types/wow/wow-patch-notes.type';
import {
  patchNotesText,
  patchNotesBlocks,
} from '@Services/wow/wow-patch-notes-content';

export const WOW_NEWS_URL = 'https://worldofwarcraft.blizzard.com/en-gb/news';
const articleSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1),
  content: z.string().min(1).max(500_000),
  published: z.iso.datetime(),
  status: z.string(),
  draft: z.boolean(),
  pending: z.boolean(),
});
const months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function sectionDate(text: string): string | null {
  const match = /^(\w+) (\d{1,2}), (\d{4})$/.exec(text);
  if (!match) return null;
  const month = months.indexOf(match[1]);
  if (month < 0) return null;
  const day = Number(match[2]);
  const date = new Date(Date.UTC(Number(match[3]), month, day));
  return date.getUTCMonth() === month && date.getUTCDate() === day
    ? date.toISOString().slice(0, 10)
    : null;
}

export function parsePatchNotesNews(
  html: string,
  checkedAt = new Date().toISOString(),
): WowPatchNotesEntry[] {
  const script = html
    .match(/<script\b[^>]*\bid=["']model["'][^>]*>([\s\S]*?)<\/script>/i)?.[1]
    .trim();
  if (!script || !/^model\s*=/.test(script))
    throw new WowSourceError(
      'Official patch notes did not include a valid news index.',
    );
  let model: unknown;
  try {
    model = JSON.parse(
      script.replace(/^model\s*=\s*/, '').replace(/;\s*$/, ''),
    );
  } catch (error) {
    throw new WowSourceError(
      'Could not read the official patch notes index.',
      false,
      error,
    );
  }
  const result = z
    .object({ blogList: z.object({ blogs: z.array(z.unknown()).min(1) }) })
    .safeParse(model);
  if (!result.success)
    throw new WowSourceError(
      'The official news index format has changed.',
      false,
      result.error,
    );
  const entries: WowPatchNotesEntry[] = [];
  const articleIds = new Set<number>();
  for (const raw of result.data.blogList.blogs) {
    const title = z.object({ title: z.string() }).parse(raw).title;
    if (
      !/\bforever\b/i.test(title) ||
      !/hotfix|(?:patch|update)\s+notes/i.test(title) ||
      /\b(?:ptr|beta|development notes)\b/i.test(title)
    )
      continue;
    const parsed = articleSchema.safeParse(raw);
    if (!parsed.success)
      throw new WowSourceError(
        'A Forever patch notes article has an invalid format.',
        false,
        parsed.error,
      );
    const article = parsed.data;
    if (
      article.draft ||
      article.pending ||
      article.status !== 'live' ||
      Date.parse(article.published) > Date.parse(checkedAt)
    )
      continue;
    if (articleIds.has(article.id))
      throw new WowSourceError(
        'The official news index contains duplicate patch notes articles.',
      );
    articleIds.add(article.id);
    const dates = [
      ...article.content.matchAll(/<(p|h[1-6])\b[^>]*>([\s\S]*?)<\/\1>/gi),
    ]
      .map((m) => ({
        date: sectionDate(patchNotesText(m[2])),
        start: m.index,
        end: m.index + m[0].length,
      }))
      .filter(
        (m): m is { date: string; start: number; end: number } =>
          m.date !== null,
      );
    const hotfix = /hotfix/i.test(article.title);
    if (hotfix && !dates.length)
      throw new WowSourceError(
        'Could not identify the dated Forever hotfix sections.',
      );
    const sections = dates.length
      ? dates.map((d, i) => ({
          id: d.date,
          date: `${d.date}T00:00:00.000Z`,
          text: patchNotesText(
            article.content.slice(d.end, dates[i + 1]?.start),
          ),
          blocks: patchNotesBlocks(
            article.content.slice(d.end, dates[i + 1]?.start),
          ),
          title: hotfix
            ? `WoW: Forever Hotfixes — ${d.date}`
            : `${article.title} — ${d.date}`,
        }))
      : [
          {
            id: 'article',
            date: article.published,
            text: patchNotesText(article.content),
            blocks: patchNotesBlocks(article.content),
            title: article.title,
          },
        ];
    for (const section of sections) {
      if (!section.text)
        throw new WowSourceError('An official patch notes section is empty.');
      const key = `${article.id}:${section.id}`;
      if (entries.some((e) => e.key === key))
        throw new WowSourceError(
          'An official patch notes article contains duplicate dates.',
        );
      entries.push({
        key,
        hash: createHash('sha256')
          .update(section.text.replace(/\s+/g, ' '))
          .digest('hex'),
        title: section.title,
        text: section.text,
        blocks: section.blocks,
        publishedAt: section.date,
        url: `${WOW_NEWS_URL}/${article.id}`,
      });
    }
  }
  return entries.sort(
    (a, b) =>
      a.publishedAt.localeCompare(b.publishedAt) || a.key.localeCompare(b.key),
  );
}

@Injectable()
export class WowPatchNotesSourceService {
  constructor(private readonly http: HttpService) {}

  async read(): Promise<WowPatchNotesEntry[]> {
    let stage = 'request';
    try {
      const response = await firstValueFrom(
        this.http.get<string>(WOW_NEWS_URL, {
          responseType: 'text',
          maxRedirects: 0,
        }),
      );
      stage = 'parse';
      return parsePatchNotesNews(response.data);
    } catch (error) {
      throw new WowSourceError(
        error instanceof WowSourceError
          ? error.message
          : 'Official Forever patch notes are temporarily unavailable.',
        false,
        error,
        `source=patch-notes stage=${stage}`,
      );
    }
  }
}
