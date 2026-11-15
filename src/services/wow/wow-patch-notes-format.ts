import { EmbedBuilder, escapeMarkdown } from 'discord.js';
import { WowEmbedService } from '@Services/wow/wow-embed.service';
import {
  WowPatchNotesEntry,
  WowPatchSummaryBullet,
} from '@Types/wow/wow-patch-notes.type';

const PAGE_TEXT_MAX = 2000;

/** AI chooses emphasis; only the renderer introduces Markdown formatting. */
export function formatPatchSummary(bullets: WowPatchSummaryBullet[]): string {
  return bullets
    .map(
      (bullet) =>
        '• ' +
        bullet.parts
          .map((part) => {
            const text = escapeMarkdown(part.text);
            return part.bold ? '**' + text + '**' : text;
          })
          .join(''),
    )
    .join('\n\n');
}

/** Split source text before escaping, preserving words and Unicode pairs. */
function chunks(text: string, limit: number): string[] {
  const result: string[] = [];
  let remaining = text;
  while (escapeMarkdown(remaining).length > limit) {
    let end = Math.min(limit, remaining.length);
    while (escapeMarkdown(remaining.slice(0, end)).length > limit) end--;
    const boundary = Math.max(
      remaining.lastIndexOf('\n', end),
      remaining.lastIndexOf(' ', end),
    );
    if (boundary > end / 2) end = boundary;
    if (/[\uD800-\uDBFF]/.test(remaining[end - 1])) end--;
    result.push(escapeMarkdown(remaining.slice(0, end)));
    remaining = remaining.slice(end).trimStart();
  }
  if (remaining) result.push(escapeMarkdown(remaining));
  return result;
}

function descriptions(entry: WowPatchNotesEntry): string[] {
  const blocks =
    entry.blocks?.length &&
    entry.blocks.every((b) => escapeMarkdown(b.path.join(' · ')).length < 800)
      ? entry.blocks
      : [{ path: [], text: entry.text, bullet: false }];
  const pages: string[] = [];
  let current = '';
  let currentPath = '';
  for (const block of blocks) {
    const path = block.path.length
      ? '**' + escapeMarkdown(block.path.join(' · ')) + '**'
      : '';
    const prefix = block.bullet ? '• ' : '';
    for (const part of chunks(
      block.text,
      PAGE_TEXT_MAX - path.length - prefix.length - 2,
    )) {
      const heading = path && path !== currentPath ? path + '\n' : '';
      const addition = (current ? '\n\n' : '') + heading + prefix + part;
      if (current && current.length + addition.length > PAGE_TEXT_MAX) {
        pages.push(current);
        current = (path ? path + '\n' : '') + prefix + part;
      } else current += addition;
      currentPath = path;
    }
  }
  if (current) pages.push(current);
  return pages;
}

/** One embed per page, with every original change followed by a separate overview. */
export function patchNotesPages(
  renderer: WowEmbedService,
  entry: WowPatchNotesEntry,
  summary: string | null,
  updated: boolean,
): EmbedBuilder[] {
  const pages = descriptions(entry).map((description) =>
    renderer
      .message(description)[0]
      .setTitle(((updated ? 'Updated: ' : '') + entry.title).slice(0, 256))
      .setURL(entry.url),
  );
  pages.push(
    renderer
      .message(
        summary ??
          'AI summary is currently unavailable. The complete official changes remain available alongside the source link.',
        summary ? 'info' : 'warning',
      )[0]
      .setTitle(
        summary
          ? 'What this means for players · AI summary'
          : 'AI summary unavailable',
      )
      .setAuthor({ name: entry.title.slice(0, 256) })
      .setURL(entry.url),
  );
  return pages.map((embed, i) => {
    const original = embed.toJSON().footer;
    return embed.setFooter({
      ...original,
      text:
        (original?.text ? original.text.slice(0, 1800) + ' · ' : '') +
        (i === pages.length - 1
          ? 'AI summary'
          : 'Page ' +
            (i + 1) +
            ' of ' +
            (pages.length - 1) +
            ' · Official changes'),
    });
  });
}

/** Automatic notifications retain complete, ordered delivery through the outbox. */
export function patchNotesMessages(
  renderer: WowEmbedService,
  entry: WowPatchNotesEntry,
  summary: string | null,
  updated: boolean,
): EmbedBuilder[][] {
  const batches: EmbedBuilder[][] = [];
  let batch: EmbedBuilder[] = [];
  let length = 0;
  for (const embed of patchNotesPages(renderer, entry, summary, updated)) {
    const e = embed.toJSON();
    const size =
      (e.title?.length ?? 0) +
      (e.description?.length ?? 0) +
      (e.footer?.text.length ?? 0) +
      (e.author?.name.length ?? 0);
    if (batch.length && (batch.length >= 10 || length + size > 5900)) {
      batches.push(batch);
      batch = [];
      length = 0;
    }
    // Discord hides later embeds in a message when they share the same URL.
    if (batch.length) embed.setURL(null);
    batch.push(embed);
    length += size;
  }
  if (batch.length) batches.push(batch);
  return batches;
}
