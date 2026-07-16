export const STEAM_CONFIG = {
  language: 'en',
  currencyCountryCode: 'us',
  enrichDelayMs: 1500,
  pendingObserverTtl: 300,
  staleSyncGapMs: 30 * 24 * 60 * 60 * 1000,
} as const;
