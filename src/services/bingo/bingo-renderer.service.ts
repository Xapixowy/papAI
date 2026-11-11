import { Injectable } from '@nestjs/common';
import sharp from 'sharp';
import { BingoGame } from '@Database/entities/bingo.entity';
import { cellLabel, completedLines } from './bingo-rules';

const xml = (text: string) =>
  text.replace(
    /[<>&"']/g,
    (ch) =>
      ({
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&apos;',
      })[ch]!,
  );

/** Pango measures real glyph widths, including long words and user-supplied Unicode. */
async function fitText(
  text: string,
  font: string,
  color: string,
  width: number,
  height: number,
) {
  const options = {
    text: `<span foreground="${color}">${xml(text)}</span>`,
    font,
    width,
    rgba: true,
    align: 'center' as const,
    wrap: 'word-char' as const,
    spacing: 5,
  };
  const natural = await sharp({ text: options })
    .png()
    .toBuffer({ resolveWithObject: true });
  if (natural.info.height <= height) return natural;
  return sharp({ text: { ...options, height } })
    .png()
    .toBuffer({ resolveWithObject: true });
}

@Injectable()
export class BingoRendererService {
  async render(game: BingoGame): Promise<Buffer> {
    const tile = 230,
      gap = 10,
      pad = 32,
      top = 142;
    const width = pad * 2 + game.size * tile + (game.size - 1) * gap;
    const height = top + game.size * (tile + gap) + 58;
    const completed = new Set(completedLines(game.cells, game.size).flat());
    const marked = game.cells.filter((c) => c.markedBy).length;
    const header = `${game.size} × ${game.size} · ${marked}/${game.cells.length} marked · ${game.endedAt ? 'Game ended' : 'Game in progress'}`;
    const backgrounds = game.cells
      .map((cell, i) => {
        const x = pad + (i % game.size) * (tile + gap),
          y = top + Math.floor(i / game.size) * (tile + gap);
        return `<rect x="${x}" y="${y}" width="${tile}" height="${tile}" rx="12" fill="${completed.has(i) ? '#174737' : cell.markedBy ? '#263748' : '#1c2532'}" stroke="${completed.has(i) ? '#69ddb0' : '#415067'}" stroke-width="2"/><text x="${x + 16}" y="${y + 30}" fill="#a8bad1" font-size="16" font-weight="bold">${cellLabel(i, game.size)}${cell.markedBy ? ' · MARKED' : ''}</text>`;
      })
      .join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#101722"/><g font-family="sans-serif"><text x="${pad}" y="108" fill="#a8bad1" font-size="19">${header}</text>${backgrounds}<text x="${pad}" y="${height - 22}" fill="#a8bad1" font-size="16">${completed.size ? 'BINGO! Completed lines are highlighted.' : 'Complete a row, column, or main diagonal.'}</text></g></svg>`;
    const title = await fitText(
      game.setName,
      'sans bold 28',
      '#f3f6fa',
      width - pad * 2,
      58,
    );
    const overlays = await Promise.all(
      game.cells.map(async (cell, i) => {
        const rendered = await fitText(
          cell.text,
          'sans 22',
          cell.markedBy ? '#b4c8d5' : '#f3f6fa',
          tile - 32,
          152,
        );
        return {
          input: rendered.data,
          left: Math.round(
            pad +
              (i % game.size) * (tile + gap) +
              (tile - rendered.info.width) / 2,
          ),
          top: Math.round(
            top +
              Math.floor(i / game.size) * (tile + gap) +
              54 +
              (160 - rendered.info.height) / 2,
          ),
        };
      }),
    );
    const strikes = game.cells
      .flatMap((cell, i) => {
        if (!cell.markedBy) return [];
        const x = pad + (i % game.size) * (tile + gap),
          y = top + Math.floor(i / game.size) * (tile + gap);
        return [
          `<path d="M ${x + 18} ${y + tile - 22} L ${x + tile - 18} ${y + 50}" stroke="#ff8080" stroke-width="5" opacity="0.75" stroke-linecap="round"/>`,
        ];
      })
      .join('');
    return sharp(Buffer.from(svg))
      .composite([
        { input: title.data, left: pad, top: 22 },
        ...overlays,
        {
          input: Buffer.from(
            `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${strikes}</svg>`,
          ),
          left: 0,
          top: 0,
        },
      ])
      .png()
      .toBuffer();
  }
}
