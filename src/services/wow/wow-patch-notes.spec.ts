import { describe, expect, it } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { Client } from 'discord.js';
import { parsePatchNotesNews } from '@Services/wow/wow-patch-notes-source.service';
import {
  patchNotesNotification,
  patchNotesPages,
  formatPatchSummary,
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
  it('emphasizes subjects, exact values and restrictions without changing the summary text', () => {
    expect(
      formatPatchSummary([
        {
          parts: [
            { text: 'Druid', bold: true },
            { text: ': coefficient ' },
            { text: '3.3% → 6.6%', bold: true },
            { text: '; ' },
            { text: 'cannot cast while moving', bold: true },
            { text: '.' },
          ],
        },
        {
          parts: [
            { text: 'Items', bold: true },
            { text: ': ' },
            { text: 'Spirit → Spell Power', bold: true },
            { text: '.' },
          ],
        },
      ]),
    ).toBe(
      '• **Druid**: coefficient **3.3% → 6.6%**; **cannot cast while moving**.\n\n• **Items**: **Spirit → Spell Power**.',
    );
  });

  it('preserves spaces, repeated words and every unbolded part', () => {
    expect(
      formatPatchSummary([
        {
          parts: [
            { text: 'Druid Restoration', bold: true },
            { text: ': Druid ' },
            { text: 'heals.' },
          ],
        },
      ]),
    ).toBe('• **Druid Restoration**: Druid heals.');
  });

  it('escapes other Markdown instead of allowing AI to style the whole response', () => {
    expect(
      formatPatchSummary([
        {
          parts: [
            { text: 'Druid', bold: true },
            { text: ': _tooltip_ versus *gameplay*.' },
          ],
        },
      ]),
    ).toBe('• **Druid**: \\_tooltip\\_ versus \\*gameplay\\*.');
  });

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

  it('keeps every detail page but publishes only the AI summary and its controls', () => {
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
    const pages = patchNotesPages(
      renderer,
      entry,
      '• A simple explanation for players.',
      false,
    ).map((e) => e.toJSON());
    expect(
      pages
        .slice(0, -1)
        .map((e) => e.description)
        .join(''),
    ).toBe(entry.text);
    expect(
      pages.every(
        (e) => e.description!.length <= 4096 && e.title!.length <= 256,
      ),
    ).toBe(true);
    const notice = patchNotesNotification(pages.at(-1)!, 'a'.repeat(64));
    expect(notice.embeds).toEqual([pages.at(-1)]);
    expect(JSON.stringify(notice)).not.toContain('A'.repeat(100));
    const buttons = notice.components[0].toJSON().components;
    expect(
      buttons.map((button) => ('label' in button ? button.label : '')),
    ).toEqual(['Details', 'Source']);
    expect(buttons[0]).toMatchObject({
      custom_id: 'wow-patch-details/' + 'a'.repeat(64),
    });
    expect(buttons[1]).toMatchObject({ url: entry.url });
    if (!('custom_id' in buttons[0])) throw new Error('Missing details ID');
    expect(buttons[0].custom_id.length).toBeLessThanOrEqual(100);
    const fallback = patchNotesPages(renderer, entry, null, true).map((e) =>
      e.toJSON(),
    );
    expect(fallback.at(-1)?.author?.name).toMatch(/^Updated:/);
    expect(
      patchNotesNotification(fallback.at(-1)!, 'a'.repeat(64)).embeds[0].title,
    ).toBe('AI summary unavailable');
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
      if (index < pages.length - 1)
        expect(page.footer!.text).toContain(
          'Page ' + (index + 1) + ' of ' + (pages.length - 1),
        );
      else {
        expect(page.footer!.text).not.toContain('Page ');
        expect(page.author?.name).toBe(entry.title);
      }
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
