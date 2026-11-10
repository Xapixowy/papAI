export interface WowRealm {
  slug: string;
  name: string;
  online: boolean;
}

export interface WowCharacter {
  slug: string;
  name: string;
  level: number;
  guild: string | null;
  faction: string;
  race: string;
  class: string;
  ruleset: string;
  talents: { id: string; name: string; points: number }[];
  specialization: string | null;
  stats: { name: string; value: string }[];
  professions: { name: string; points: number; max: number }[];
  pvp: { honorableKills: number | null; rank: number | null };
  sourceUpdatedAt: string;
  checkedAt: string;
  url: string;
  avatar: string | null;
}

export interface WowForumPost {
  id: number;
  topicId: number;
  authorId: number;
  createdAt: string;
  updatedAt?: string;
  text: string;
  title: string;
  url: string;
  staff: boolean;
}

export interface WowForumSnapshot {
  posts: WowForumPost[];
  checkedAt: string;
}

export interface WowHealthState<T> {
  snapshot: T | null;
  failures: number;
  unavailable: boolean;
  version: number;
}

export interface WowForumState {
  startedAt: string;
  lastReportAt: string | null;
  waveStartedAt: string | null;
  alerted: boolean;
  confirmed: boolean;
  resolved: boolean;
  topicIds: number[];
  seenStaffRevisions: string[];
  continuousSince: string | null;
  lastCheckedAt: string | null;
}

export const WOW_EU_BASE =
  'https://worldofwarcraft.blizzard.com/en-gb/forever/eu';
export const WOW_FORUM_BASE = 'https://eu.forums.blizzard.com/en/wow';

export class WowSourceError extends Error {
  constructor(
    message: string,
    public readonly notFound = false,
    cause?: unknown,
    public readonly context?: string,
  ) {
    super(message, { cause });
    this.name = 'WowSourceError';
  }
}
