export interface WowPatchNotesBlock {
  path: string[];
  text: string;
  bullet: boolean;
}

export interface WowPatchSummaryBullet {
  parts: { text: string; bold?: boolean }[];
}

import type { APIEmbed } from 'discord.js';

export interface WowPatchNotesEntry {
  key: string;
  hash: string;
  title: string;
  url: string;
  publishedAt: string;
  text: string;
  blocks?: WowPatchNotesBlock[];
}

export interface WowPatchNotesState {
  initialized: boolean;
  latestDate: string;
  seen: Record<string, string[]>;
}

export const patchNotesStateKey = (guildId: string, channelId: string) =>
  `patch-notes:${guildId}:${channelId}`;

export const initialPatchNotesState = (): WowPatchNotesState => ({
  initialized: false,
  latestDate: '',
  seen: {},
});
export interface WowPatchView {
  guildId: string;
  channelId: string;
  pages: APIEmbed[];
}

export const patchViewKey = (token: string) => 'patch-view:' + token;
export const patchNotificationKey = (token: string) => 'patch-summary:' + token;
export const patchNotificationToken = (key: string): string | null =>
  /^patch-summary:([a-f0-9]{64})$/.exec(key)?.[1] ?? null;
