import {
  WowCharacter,
  WowForumPost,
  WowForumSnapshot,
  WowForumState,
  WowRealm,
} from '@Types/wow/wow.type';
import { escapeMarkdown } from 'discord.js';

export function characterChanges(
  before: WowCharacter,
  after: WowCharacter,
): string[] {
  if (Date.parse(after.sourceUpdatedAt) < Date.parse(before.sourceUpdatedAt))
    return [];
  const changes: string[] = [];
  if (after.level > before.level)
    changes.push(`Level: **${before.level} → ${after.level}**`);
  if (after.guild !== before.guild)
    changes.push(
      `Guild: **${escapeMarkdown(before.guild ?? 'None')} → ${escapeMarkdown(after.guild ?? 'None')}**`,
    );
  if (
    before.specialization &&
    after.specialization &&
    before.specialization !== after.specialization
  ) {
    const name = (c: WowCharacter) =>
      c.talents.find((s) => s.id === c.specialization)?.name ??
      c.specialization;
    changes.push(`Specialization: **${name(before)} → ${name(after)}**`);
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
