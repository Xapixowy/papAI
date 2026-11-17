import { describe, expect, it } from '@jest/globals';
import { quoteInput } from './quote-rules';
import { quoteForm } from './quote-ui.service';
import { quoteEmbed, quoteListEmbed, quotePages } from './quote-renderer';
import { Quote } from '@Database/entities/quote.entity';
import { ComponentType } from 'discord.js';

describe('Quote content and display', () => {
  it('preserves multiline display text while normalizing duplicate identity', () => {
    const input = quoteInput('  Ada Lovelace ', ' First line\r\nSecond\tline ');
    expect(input.author).toBe('Ada Lovelace');
    expect(input.content).toBe('First line\nSecond\tline');
    expect(input.fingerprint).toBe(
      quoteInput('ADA   LOVELACE', 'first   line second line').fingerprint,
    );
    expect(input.fingerprint).not.toBe(
      quoteInput('Someone else', input.content).fingerprint,
    );
    expect(quoteInput('José', 'Café').fingerprint).toBe(
      quoteInput('Jose\u0301', 'Cafe\u0301').fingerprint,
    );
  });

  it.each([
    ['', 'Text'],
    ['Author', ' \n\t '],
    ['a'.repeat(101), 'Text'],
    ['Author', 'x'.repeat(2001)],
    ['A\nB', 'Text'],
    ['Author', 'A\u0000B'],
  ])('rejects invalid author/content %#', (author, content) => {
    expect(() => quoteInput(author, content)).toThrow();
  });

  it('renders full boundary-length text without truncating or treating it as formatting', () => {
    const quote = Object.assign(
      new Quote(),
      quoteInput('a'.repeat(100), '*'.repeat(2000)),
    );
    const embed = quoteEmbed(quote).toJSON();
    expect(embed.description!.slice(1, -1).replace(/\\/g, '')).toBe(
      '*'.repeat(2000),
    );
    expect(embed.description!.length).toBeLessThanOrEqual(4096);
    expect(embed.description!.startsWith('“\\*')).toBe(true);
    expect(embed.footer!.text).toBe(`— ${quote.author}`);
    expect(embed.author).toBeUndefined();
    expect(embed.title).toBeUndefined();
    expect(embed.timestamp).toBeUndefined();
    expect(embed.color).toBeUndefined();
  });

  it('packs several complete quotes into one page and splits before the description limit', () => {
    const quotes = Array.from({ length: 6 }, (_, n) =>
      Object.assign(
        new Quote(),
        quoteInput(`Author ${n}`, `Quote ${n}\n${'x'.repeat(850)}`),
      ),
    );
    const pages = quotePages(quotes);
    expect(pages).toHaveLength(2);
    expect(pages[0].description).toContain('Quote 3');
    expect(pages[0].description).not.toContain('Quote 4');
    expect(pages[1].description).toContain('Quote 4');
    for (const page of pages)
      expect(page.description.length).toBeLessThanOrEqual(4096);
    for (const quote of quotes)
      expect(
        pages.filter((page) => page.description.includes(quote.content)),
      ).toHaveLength(1);
    expect(quotePages([])).toEqual([]);
  });

  it('preserves maximum-length escaped content and author without overflowing a list page', () => {
    const quote = Object.assign(
      new Quote(),
      quoteInput('\\'.repeat(100), '\\'.repeat(2000)),
    );
    const pages = quotePages([quote]);
    expect(pages).toHaveLength(1);
    const embed = quoteListEmbed(
      pages[0],
      'Test Server · Quotes',
      'Page 1 of 1 · 1 quote',
    ).toJSON();
    expect(embed.description!.length).toBe(4002);
    expect(embed.footer!.text).toBe(
      `— ${quote.author} · Page 1 of 1 · 1 quote`,
    );
    expect(embed.title).toBe('Test Server · Quotes');
  });

  it('builds required add and prefilled multiline edit forms', () => {
    const add = quoteForm('quote/add').toJSON();
    expect(add.components).toHaveLength(2);
    for (const row of add.components) {
      if (row.type !== ComponentType.ActionRow)
        throw new Error('Expected a form row');
      for (const field of row.components) {
        if (field.type !== ComponentType.TextInput)
          throw new Error('Expected a text field');
        expect(field.required).toBe(true);
        // Discord rejects an explicitly empty default value even though the builder accepts it.
        expect(field.value).toBeUndefined();
      }
    }
    const quote = Object.assign(
      new Quote(),
      quoteInput('Author', 'First\nSecond'),
    );
    expect(
      JSON.stringify(quoteForm('quote/save/test', quote).toJSON()),
    ).toContain('First\\nSecond');
  });
});
