import { describe, expect, it } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { Client } from 'discord.js';
import { parsePatchNotesNews } from '@Services/wow/wow-patch-notes-source.service';
import {
  patchNotesMessages,
  patchNotesPages,
} from '@Services/wow/wow-patch-notes-format';
import {
  patchNotesBlocks,
  patchNotesText,
} from '@Services/wow/wow-patch-notes-content';
import { WowEmbedService } from '@Services/wow/wow-embed.service';

const article = (overrides: Record<string, unknown> = {}) => ({
  id: 42,
  title: 'WoW: Forever Hotfixes - November 10, 2026',
  content:
    '<p><strong>November 10, 2026</strong></p><p>Classes</p><ul><li>Druid healing coefficient increased to 6.6% (was 3.3%).</li></ul><p><strong>November 9, 2026</strong></p><ul><li>Quest drop fixed.</li></ul>',
  published: '2026-11-10T18:00:00.000Z',
  status: 'live',
  draft: false,
  pending: false,
  ...overrides,
});
const news = (blogs: unknown[]) =>
  `<script id="model">model = ${JSON.stringify({ blogList: { blogs } }).replace(/</g, '\\u003c')};</script>`;
const parse = (blogs: unknown[]) =>
  parsePatchNotesNews(news(blogs), '2026-11-15T18:00:00Z');

describe('Official Forever patch notes', () => {
  it('extracts dated hotfix sections and includes live numbered patches only', () => {
    const result = parse([
      article(),
      article({
        id: 43,
        title: 'WoW: Forever 1.1.0 Content Update Notes',
        content: '<h2>Classes</h2><ul><li>Changed an ability.</li></ul>',
      }),
      article({ id: 44, title: 'World of Warcraft Content Update Notes' }),
      article({ id: 45, title: 'WoW: Forever news roundup' }),
      article({ id: 46, title: 'WoW: Forever PTR Update Notes' }),
      article({ id: 47, draft: true }),
      article({ id: 48, published: '2026-11-20T18:00:00Z' }),
    ]);
    expect(result.map((e) => e.key)).toEqual([
      '42:2026-11-09',
      '42:2026-11-10',
      '43:article',
    ]);
    expect(result[1]).toMatchObject({
      title: 'WoW: Forever Hotfixes — 2026-11-10',
      url: 'https://worldofwarcraft.blizzard.com/en-gb/news/42',
    });
    expect(result[1].text).toContain('6.6% (was 3.3%)');
    expect(result[1].text).not.toContain('Quest drop');
  });

  it('keeps content identity through changing article titles, dates and markup', () => {
    const before = parse([article()]);
    const after = parse([
      article({
        title: 'WoW: Forever Hotfixes - November 11, 2026',
        published: '2026-11-11T18:00:00Z',
        content: String(article().content)
          .replace('Classes', '<strong>Classes</strong>')
          .replace('healing coefficient', 'healing\n  coefficient'),
      }),
    ]);
    expect(after.map((e) => [e.key, e.hash])).toEqual(
      before.map((e) => [e.key, e.hash]),
    );
    const revised = parse([
      article({ content: String(article().content).replace('6.6%', '7.0%') }),
    ]);
    expect(revised[0].hash).toBe(before[0].hash);
    expect(revised[1].key).toBe(before[1].key);
    expect(revised[1].hash).not.toBe(before[1].hash);
  });

  it('rejects incomplete indexes and ambiguous dated sections instead of silently resetting state', () => {
    expect(() =>
      parsePatchNotesNews('<script>throw new Error()</script>'),
    ).toThrow();
    expect(() =>
      parsePatchNotesNews('<script id="model">model = broken;</script>'),
    ).toThrow();
    expect(() => parse([])).toThrow();
    expect(() =>
      parse([article({ content: '<p>No dates here</p>' })]),
    ).toThrow();
    expect(() => parse([article(), article()])).toThrow();
    expect(() =>
      parse([
        article({
          content:
            String(article().content) +
            '<p>November 10, 2026</p><p>Duplicate date.</p>',
        }),
      ]),
    ).toThrow();
    expect(() => parse([article({ published: 'invalid' })])).toThrow();
  });

  it('preserves readable lists, table boundaries and entities without executing HTML', () => {
    expect(
      patchNotesText(
        '<script>doBadThings()</script><p>Classes &amp; items</p><ul><li>Damage &#x2192; 20 &ndash; 30</li></ul><table><tr><td>Old</td><td>New</td></tr></table>',
      ),
    ).toBe('Classes & items\n• Damage → 20 – 30\nOld | New |');
  });

  it('splits long notes without dropping text, respects Discord limits and puts the AI summary last', () => {
    const renderer = new WowEmbedService(
      new Client({ intents: [] }),
      new ConfigService({
        discord: {
          botName: 'Test bot',
          colors: { info: 0x5865f2, warning: 0xffaa00 },
        },
        app: { version: 'test' },
      }),
    );
    const entry = {
      ...parse([article()])[0],
      blocks: undefined,
      text: 'A'.repeat(25_000),
    };
    const batches = patchNotesMessages(
      renderer,
      entry,
      '• A simple explanation for players.',
      false,
    ).map((batch) => batch.map((e) => e.toJSON()));
    const embeds = batches.flat();
    expect(embeds.at(-1)?.title).toContain('AI summary');
    expect(
      embeds
        .slice(0, -1)
        .map((e) => e.description)
        .join(''),
    ).toBe(entry.text);
    for (const batch of batches) {
      // Reusing a URL hides later embeds in the Discord client.
      const urls = batch.flatMap((e) => (e.url ? [e.url] : []));
      expect(new Set(urls).size).toBe(urls.length);
      expect(batch.length).toBeLessThanOrEqual(10);
      expect(
        batch.every(
          (e) => e.description!.length <= 4096 && e.title!.length <= 256,
        ),
      ).toBe(true);
      expect(
        batch.reduce(
          (n, e) =>
            n + e.title!.length + e.description!.length + e.footer!.text.length,
          0,
        ),
      ).toBeLessThanOrEqual(6000);
    }
    const fallback = patchNotesMessages(renderer, entry, null, true)
      .flat()
      .map((e) => e.toJSON());
    expect(fallback[0].title).toMatch(/^Updated:/);
    expect(fallback.at(-1)?.title).toBe('AI summary unavailable');
  });

  it('keeps nested class/specification context, developer notes, conditions and source order', () => {
    const blocks = patchNotesBlocks(
      '<div><p><strong>Classes</strong></p><ul><li>Druid<ul><li>Restoration<ul>' +
        '<li>Wild Growth coefficient: 6.6% (was 3.3%).<p><em>Developers’ notes:</em> This is a coefficient change, not doubled total healing.</p></li>' +
        '<li>Cannot be cast while moving.</li></ul></li></ul></li>' +
        '<li>Shaman<ul><li>Windfury triggers on main-hand strikes; off-hand hits cannot trigger it.</li></ul></li></ul>' +
        '<h2>Items</h2><p>The exchange cannot be reversed.</p><script>doBadThings()</script></div>',
    );
    expect(blocks).toEqual([
      {
        path: ['Classes', 'Druid', 'Restoration'],
        text: 'Wild Growth coefficient: 6.6% (was 3.3%).\nDevelopers’ notes: This is a coefficient change, not doubled total healing.',
        bullet: true,
      },
      {
        path: ['Classes', 'Druid', 'Restoration'],
        text: 'Cannot be cast while moving.',
        bullet: true,
      },
      {
        path: ['Classes', 'Shaman'],
        text: 'Windfury triggers on main-hand strikes; off-hand hits cannot trigger it.',
        bullet: true,
      },
      {
        path: ['Items'],
        text: 'The exchange cannot be reversed.',
        bullet: false,
      },
    ]);
  });

  it('repeats source context across readable pages without omitting any change or qualifier', () => {
    const renderer = new WowEmbedService(
      new Client({ intents: [] }),
      new ConfigService({
        discord: {
          botName: 'Test bot',
          colors: { info: 0x5865f2, warning: 0xffaa00 },
        },
        app: { version: 'test' },
      }),
    );
    const notes = Array.from(
      { length: 30 },
      (_, i) =>
        'Change ' +
        i +
        ': coefficient increased to 6.6% (was 3.3%); only with realm restarts. Off-hand hits are excluded.',
    );
    const entry = {
      ...parse([article()])[0],
      blocks: notes.map((text) => ({
        path: ['Classes', 'Druid', 'Restoration'],
        text,
        bullet: true,
      })),
    };
    const pages = patchNotesPages(
      renderer,
      entry,
      '• A separate AI overview.',
      false,
    ).map((e) => e.toJSON());
    expect(pages.length).toBeGreaterThan(2);
    const text = pages
      .slice(0, -1)
      .map((p) => p.description)
      .join('\n');
    for (const note of notes) expect(text.split(note)).toHaveLength(2);
    for (const [index, page] of pages.entries()) {
      expect(page.description!.length).toBeLessThanOrEqual(2000);
      expect(page.footer!.text).toContain(
        'Page ' + (index + 1) + ' of ' + pages.length,
      );
      if (index < pages.length - 1)
        expect(page.description).toContain('**Classes · Druid · Restoration**');
    }
    expect(pages.at(-1)?.title).toContain('AI summary');
    expect(pages.at(-1)?.description).toBe('• A separate AI overview.');
  });

  it('splits oversized individual changes safely and escapes source Markdown', () => {
    const renderer = new WowEmbedService(
      new Client({ intents: [] }),
      new ConfigService({
        discord: {
          botName: 'Test bot',
          colors: { info: 0x5865f2, warning: 0xffaa00 },
        },
      }),
    );
    const entry = {
      ...parse([article()])[0],
      blocks: undefined,
      text: '😀*'.repeat(2000),
    };
    const pages = patchNotesPages(renderer, entry, null, false)
      .slice(0, -1)
      .map((p) => p.toJSON());
    expect(pages.map((p) => p.description).join('')).toBe('😀\\*'.repeat(2000));
    for (const page of pages) {
      expect(page.description!.length).toBeLessThanOrEqual(2000);
      expect(page.description).not.toMatch(/[\uD800-\uDBFF]$/);
      expect(page.description).not.toMatch(/^[\uDC00-\uDFFF]/);
    }
  });
});
