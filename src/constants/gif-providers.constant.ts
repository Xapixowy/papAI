export const GIF_PROVIDERS = {
  tenor: { name: 'Tenor', url: 'https://tenor.com' },
  giphy: { name: 'Giphy', url: 'https://giphy.com' },
  klipy: { name: 'Klipy', url: 'https://klipy.com' },
} as const;

export type GifProvider = (typeof GIF_PROVIDERS)[keyof typeof GIF_PROVIDERS];
