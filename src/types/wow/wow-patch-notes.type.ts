export interface WowPatchNotesBlock {
  path: string[];
  text: string;
  bullet: boolean;
}

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
