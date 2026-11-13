import {
  WowCharacter,
  WowCharacterSection,
  WowForumPost,
  WowForumSnapshot,
  WowForumState,
  WowRealm,
} from '@Types/wow/wow.type';
import { escapeMarkdown } from 'discord.js';

const available = (c: WowCharacter, field: WowCharacterSection | 'name') =>
  field === 'name' || !c.unavailableFields?.includes(field);
const older = (before: WowCharacter, after: WowCharacter) =>
  !!(
    before.sourceUpdatedAt &&
    after.sourceUpdatedAt &&
    Date.parse(after.sourceUpdatedAt) < Date.parse(before.sourceUpdatedAt)
  );

/** Monitoring retains last-known optional values through temporary gaps in Armory data. */
export function characterBaseline(
  before: WowCharacter | null,
  after: WowCharacter,
): WowCharacter {
  const snapshot: WowCharacter = {
    ...after,
    unavailableFields: [...(after.unavailableFields ?? [])],
    specialization: after.specialization ?? before?.specialization ?? null,
  };
  if (!before) return snapshot;
  const carry = <K extends WowCharacterSection>(field: K) => {
    snapshot[field] = before[field];
  };
  for (const field of after.unavailableFields ?? []) {
    if (!available(before, field)) continue;
    carry(field);
    if (field === 'talents') snapshot.specialization = before.specialization;
    snapshot.unavailableFields = (snapshot.unavailableFields ?? []).filter(
      (f) => f !== field,
    );
  }
  return snapshot;
}

export function characterChanges(
  before: WowCharacter,
  after: WowCharacter,
): string[] {
  if (older(before, after)) return [];
  const changes: string[] = [];
  if (after.level > before.level)
    changes.push(`Level: **${before.level} → ${after.level}**`);
  if (
    available(before, 'guild') &&
    available(after, 'guild') &&
    after.guild !== before.guild
  )
    changes.push(
      `Guild: **${escapeMarkdown(before.guild ?? 'None')} → ${escapeMarkdown(after.guild ?? 'None')}**`,
    );
  if (
    available(before, 'talents') &&
    available(after, 'talents') &&
    before.specialization &&
    after.specialization &&
    before.specialization !== after.specialization
  ) {
    const name = (c: WowCharacter) =>
      c.talents.find((s) => s.id === c.specialization)?.name ??
      c.specialization ??
      'No data';
    changes.push(
      `Specialization: **${escapeMarkdown(name(before))} → ${escapeMarkdown(name(after))}**`,
    );
  }
  return changes;
}

export function characterDifferences(
  before: WowCharacter,
  after: WowCharacter,
): string[] {
  if (older(before, after)) return [];
  const changes = characterChanges(before, after);
  const add = (label: string, oldValue: string, newValue: string) => {
    if (oldValue !== newValue)
      changes.push(
        `${escapeMarkdown(label)}: **${escapeMarkdown(oldValue)} → ${escapeMarkdown(newValue)}**`,
      );
  };
  if (after.level < before.level)
    add('Level', String(before.level), String(after.level));
  for (const [field, label] of [
    ['name', 'Name'],
    ['faction', 'Faction'],
    ['race', 'Race'],
    ['class', 'Class'],
    ['ruleset', 'Ruleset'],
  ] as const)
    if (available(before, field) && available(after, field))
      add(label, before[field], after[field]);

  const professions = (c: WowCharacter) => {
    const grouped = new Map<string, WowCharacter['professions']>();
    for (const p of c.professions)
      grouped.set(p.name, [...(grouped.get(p.name) ?? []), p]);
    return new Map(
      [...grouped].map(([name, tiers]) => [
        name,
        tiers
          .sort((a, b) => a.max - b.max || a.points - b.points)
          .map((p) => `${p.points}/${p.max}`)
          .join(', '),
      ]),
    );
  };
  if (available(before, 'professions') && available(after, 'professions')) {
    const oldProfessions = professions(before);
    const newProfessions = professions(after);
    for (const name of [
      ...new Set([...oldProfessions.keys(), ...newProfessions.keys()]),
    ].sort())
      add(
        `Profession (${name})`,
        oldProfessions.get(name) ?? 'Not learned',
        newProfessions.get(name) ?? 'Not learned',
      );
  }
  if (available(before, 'talents') && available(after, 'talents')) {
    const oldTalents = new Map(before.talents.map((t) => [t.id, t]));
    const newTalents = new Map(after.talents.map((t) => [t.id, t]));
    for (const id of [
      ...new Set([...oldTalents.keys(), ...newTalents.keys()]),
    ].sort()) {
      const old = oldTalents.get(id);
      const next = newTalents.get(id);
      add(
        `Talent points (${next?.name ?? old?.name ?? id})`,
        old?.points.toString() ?? 'No data',
        next?.points.toString() ?? 'No data',
      );
    }
  }
  if (available(before, 'pvp') && available(after, 'pvp')) {
    add(
      'PvP rank',
      before.pvp.rank?.toString() ?? 'No data',
      after.pvp.rank?.toString() ?? 'No data',
    );
    add(
      'Honorable kills',
      before.pvp.honorableKills?.toString() ?? 'No data',
      after.pvp.honorableKills?.toString() ?? 'No data',
    );
  }
  return changes;
}

export function realmChanges(before: WowRealm[], after: WowRealm[]): string[] {
  return after.flatMap((r) => {
    const old = before.find((b) => b.slug === r.slug);
    return old && old.online !== r.online
      ? [`**${r.name}**: ${r.online ? '🟢 online' : '🔴 offline'}`]
      : [];
  });
}

const eu = /\b(?:eu|europe|european|europa)\b/i;
const problem =
  /(?:can(?:not|['’]?t)\s+(?:log|connect)|unable to (?:log|connect)|log(?:ging|in| in|on).{0,70}(?:stuck|fail|problem|error|issue)|(?:stuck|fail|problem|error|issue).{0,70}(?:log|character|realm|connect)|disconnect|\bdc['’]?d\b|retriev\w* character|queue.{0,50}(?:stuck|fail|disconnect))/i;
const recovery =
  /(?:resolved|fixed|restored|back to normal|should (?:now )?be able to (?:log|connect)|issues? (?:have|has) (?:now )?been resolved)/i;
const negatedRecovery =
  /(?:not|isn't|isn’t|aren't|aren’t|hasn't|hasn’t|haven't|haven’t|haven’t|never).{0,35}(?:resolved|fixed|restored|back to normal)|(?:resolved|fixed).{0,25}(?:yet|not)/i;
const confirmation =
  /(?:aware|investigat|experiencing|looking into|working on|issues? affecting)/i;
const positiveReport =
  /(?:can (?:now |finally )?(?:log in|login|connect)|able to (?:log in|login)|no (?:more |login )?(?:issues|problems)|working (?:again|fine|now))/i;
const strongProblem =
  /(?:disconnect|unable|cannot|can['’]?t|stuck|fail|error)/i;
const negatedConfirmation =
  /(?:not (?:currently )?(?:aware|investigating|experiencing)|no (?:known|reported) (?:login |connectivity )?issues)/i;

export interface WowForumEvent {
  kind: 'reports' | 'confirmed' | 'resolved';
  posts: WowForumPost[];
}

export function forumSignals(
  previous: WowForumState,
  snapshot: WowForumSnapshot,
  interrupted = false,
): { state: WowForumState; events: WowForumEvent[] } {
  const state: WowForumState = structuredClone(previous);
  const now = Date.parse(snapshot.checkedAt);
  // Never close/reset a wave merely because the source was unavailable.
  const recentReports = snapshot.posts.filter(
    (p) =>
      !p.staff &&
      Date.parse(p.createdAt) >=
        Math.max(Date.parse(state.startedAt), now - 15 * 60_000) &&
      Date.parse(p.createdAt) <= now &&
      problem.test(p.text) &&
      !(positiveReport.test(p.text) && !strongProblem.test(p.text)) &&
      !/\bnot (?:in |on )?(?:eu|europe)\b/i.test(p.text) &&
      (eu.test(p.text) ||
        (eu.test(p.title) &&
          !/\b(?:us|na|america|asia|oceania)\b/i.test(p.text))),
  );
  const gap =
    state.lastCheckedAt && now - Date.parse(state.lastCheckedAt) > 10 * 60_000;
  if (interrupted || gap || !state.continuousSince)
    state.continuousSince = snapshot.checkedAt;
  const quietSince = Math.max(
    Date.parse(state.lastReportAt ?? state.startedAt),
    Date.parse(state.continuousSince),
  );
  if (!interrupted && !gap && now - quietSince >= 60 * 60_000) {
    state.waveStartedAt = null;
    state.alerted = false;
    state.confirmed = false;
    state.resolved = false;
    state.topicIds = [];
    state.seenStaffRevisions = [];
  }
  state.lastCheckedAt = snapshot.checkedAt;
  const events: WowForumEvent[] = [];
  if (recentReports.length) {
    const latest = Math.max(
      ...recentReports.map((p) => Date.parse(p.createdAt)),
    );
    state.lastReportAt = new Date(
      Math.max(latest, Date.parse(state.lastReportAt ?? state.startedAt)),
    ).toISOString();
    const authors = new Map<number, WowForumPost>();
    for (const p of recentReports) authors.set(p.authorId, p);
    if (!state.alerted && authors.size >= 3) {
      state.waveStartedAt = new Date(
        Math.min(...recentReports.map((p) => Date.parse(p.createdAt))),
      ).toISOString();
      state.alerted = true;
      state.confirmed = false;
      state.resolved = false;
      events.push({ kind: 'reports', posts: [...authors.values()] });
    }
    if (state.alerted)
      state.topicIds = [
        ...new Set([...state.topicIds, ...recentReports.map((p) => p.topicId)]),
      ];
  }
  const staffPosts = snapshot.posts
    .filter(
      (p) =>
        p.staff &&
        state.alerted &&
        state.topicIds.includes(p.topicId) &&
        Date.parse(p.createdAt) >=
          Date.parse(state.waveStartedAt ?? snapshot.checkedAt) &&
        Date.parse(p.createdAt) <= now &&
        !state.seenStaffRevisions.includes(
          `${p.id}:${p.updatedAt ?? p.createdAt}`,
        ),
    )
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  for (const p of staffPosts) {
    state.seenStaffRevisions.push(`${p.id}:${p.updatedAt ?? p.createdAt}`);
    if (
      recovery.test(p.text) &&
      !negatedRecovery.test(p.text) &&
      !state.resolved
    ) {
      state.resolved = true;
      events.push({ kind: 'resolved', posts: [p] });
    } else if (
      confirmation.test(p.text) &&
      !negatedConfirmation.test(p.text) &&
      !state.confirmed &&
      !state.resolved &&
      (problem.test(p.text) ||
        /(?:log|connect|character|realm|server)/i.test(p.text))
    ) {
      state.confirmed = true;
      events.push({ kind: 'confirmed', posts: [p] });
    }
  }
  return { state, events };
}
