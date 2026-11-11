import { describe, expect, it } from '@jest/globals';
import { BingoGame } from '@Database/entities/bingo.entity';
import {
  bingoErrorDetails,
  bingoLabel,
  bingoText,
  cellLabel,
  completedLines,
  drawPhrases,
  normalizePhrase,
} from './bingo-rules';
import { BingoRendererService } from './bingo-renderer.service';
import sharp from 'sharp';

function board(size: number): BingoGame {
  return Object.assign(new BingoGame(), {
    id: '00000000-0000-4000-8000-000000000001',
    setName: 'Raid Bingo <&>',
    size,
    cells: Array.from({ length: size * size }, (_, i) => ({
      phraseId: String(i),
      text: `Someone says "last attempt" ${i}`,
      markedBy: null,
      markedAt: null,
    })),
    endedAt: null,
  });
}

describe('Bingo rules and rendering', () => {
  it('normalizes whitespace, Unicode and case without translating user content', () => {
    expect(bingoText('  Zażółć\n gęślą  ')).toBe('Zażółć gęślą');
    expect(normalizePhrase('  RAID   WIPE ')).toBe('raid wipe');
    expect(normalizePhrase('e\u0301')).toBe('é');
    expect(() => bingoText(' ')).toThrow('1–80');
    expect(() => bingoText('x'.repeat(81))).toThrow('1–80');
    expect(() => bingoText('hidden\u200btext')).toThrow('control');
    expect(bingoText('😀'.repeat(80))).toHaveLength(160);
    const label = bingoLabel('A1 — ' + '😀'.repeat(80));
    expect(label.length).toBeLessThanOrEqual(100);
    expect(label).not.toMatch(/[\uD800-\uDBFF]$/u);
  });

  it('draws distinct phrases without mutating the pool and rejects insufficient pools', () => {
    const pool = Array.from({ length: 40 }, (_, i) => i);
    expect(new Set(drawPhrases(pool, 25)).size).toBe(25);
    expect(pool).toEqual(Array.from({ length: 40 }, (_, i) => i));
    expect(() => drawPhrases(pool, 41)).toThrow('1 more');
    expect(cellLabel(24, 5)).toBe('E5');
  });

  for (const size of [3, 4, 5]) {
    for (const orientation of ['row', 'column', 'diagonal', 'anti-diagonal']) {
      it(`detects a ${size}×${size} ${orientation} only when complete`, () => {
        const game = board(size);
        const indices = Array.from({ length: size }, (_, n) =>
          orientation === 'row'
            ? n
            : orientation === 'column'
              ? n * size
              : orientation === 'diagonal'
                ? n * size + n
                : n * size + size - 1 - n,
        );
        for (const index of indices.slice(0, -1))
          game.cells[index].markedBy = 'user';
        expect(completedLines(game.cells, size)).toEqual([]);
        game.cells[indices.at(-1)!].markedBy = 'user';
        expect(completedLines(game.cells, size)).toContainEqual(indices);
        game.cells[indices[0]].markedBy = null;
        expect(completedLines(game.cells, size)).toEqual([]);
      });
    }
    it(`renders a valid ${size}×${size} PNG with long and XML-sensitive text`, async () => {
      const game = board(size);
      game.cells[0].text = '<script>&"'.repeat(8);
      game.cells[size * 2 - 1].text = 'W'.repeat(80);
      for (let i = 0; i < size; i++) game.cells[i].markedBy = 'user';
      const image = await new BingoRendererService().render(game);
      const metadata = await sharp(image).metadata();
      expect(metadata.format).toBe('png');
      const side = size * 230 + (size - 1) * 10 + 2;
      expect(metadata.width).toBe(side);
      expect(metadata.height).toBe(side);
      expect(metadata.hasAlpha).toBe(true);
      for (let column = 1; column < size; column++) {
        const gap = await sharp(image)
          .extract({ left: column * 240 - 5, top: 0, width: 2, height: side })
          .ensureAlpha()
          .raw()
          .toBuffer();
        expect(
          [...gap]
            .filter((_, index) => index % 4 === 3)
            .every((alpha) => alpha === 0),
        ).toBe(true);
      }
      const changedMetadata = Object.assign(new BingoGame(), game, {
        setName: 'Different title',
        endedAt: new Date(),
        revision: 99,
      });
      expect(await new BingoRendererService().render(changedMetadata)).toEqual(
        image,
      );
    });
  }

  it('keeps diagnostic codes and stack locations without exposing payloads or SQL details', () => {
    const error = Object.assign(new Error('secret-token-in-message'), {
      code: '23505',
      query: 'SELECT secret',
      parameters: ['private phrase'],
      requestBody: { token: 'discord-token' },
    });
    const details = bingoErrorDetails(error);
    expect(details).toContain('23505');
    expect(details).toContain('at ');
    for (const secret of [
      'secret-token-in-message',
      'SELECT secret',
      'private phrase',
      'discord-token',
    ])
      expect(details).not.toContain(secret);
  });
});
