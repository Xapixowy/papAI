import { GifContentFilter } from '@Types/api/gif-content-filter.type';

export const GIF_PROVIDERS = {
  tenor: { name: 'Tenor', url: 'https://tenor.com' },
  giphy: { name: 'Giphy', url: 'https://giphy.com' },
  klipy: { name: 'Klipy', url: 'https://klipy.com' },
} as const;

export type GifProvider = (typeof GIF_PROVIDERS)[keyof typeof GIF_PROVIDERS];

export const GIPHY_CONFIG = {
  randomOffsetMax: 50,
  contentFilterRating: {
    high: 'g',
    medium: 'pg',
    low: 'pg-13',
    off: 'r',
  } as Record<GifContentFilter, string>,
} as const;

export const KLIPY_CONFIG = {
  randomPageMax: 5,
} as const;
