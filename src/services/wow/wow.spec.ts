import { describe, it, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  characterSlug,
  parseCharacterHtml,
  parseRealmStatus,
} from '@Services/wow/wow-parser';
import {
  characterChanges,
  characterDifferences,
  forumSignals,
  realmChanges,
} from '@Services/wow/wow-signals';
import { forumText } from '@Services/wow/wow-forum.service';
import { initialForum } from '@Services/wow/wow-monitor.service';
import { WowForumPost, WowForumState } from '@Types/wow/wow.type';

const profile = JSON.parse(
  readFileSync(join(__dirname, '__fixtures__/character.json'), 'utf8'),
) as {
  character: {
    level: number;
    specs: { id: string; name: string; spentPoints: number }[];
  };
};
const realms: unknown = JSON.parse(
  readFileSync(join(__dirname, '__fixtures__/realms.json'), 'utf8'),
);
const html = (data: unknown) =>
  `<script type="text/javascript" id="character-profile-mount-initial-state">var characterProfileInitialState = ${JSON.stringify(data)};</script>`;
const character = () =>
  parseCharacterHtml(html(profile), 'judgement-judy', '2026-11-09T18:00:00Z');
const time = (minutes: number) =>
  new Date(Date.UTC(2026, 10, 9, 18, minutes)).toISOString();
const post = (
  id: number,
  authorId = id,
  minutes = 5,
  other: Partial<WowForumPost> = {},
): WowForumPost => ({
  id,
  authorId,
  topicId: 42,
  createdAt: time(minutes),
  text: 'Cannot log in on EU servers',
  title: 'Login problems',
  url: `https://eu.forums.blizzard.com/en/wow/t/42/${id}`,
  staff: false,
  ...other,
});
const reports = [post(1), post(2), post(3)];
const tick = (
  state: WowForumState,
  posts: WowForumPost[],
  minutes: number,
  interrupted = false,
) => forumSignals(state, { posts, checkedAt: time(minutes) }, interrupted);

describe('WoW Forever data and notification semantics', () => {
  it('reads the observed official profile without executing scripts', () => {
    const c = character();
    expect(c).toMatchObject({
      name: 'Judgement Judy',
      level: 25,
      guild: 'Circle of Lore',
      specialization: 'retribution',
      pvp: { honorableKills: 0, rank: 0 },
    });
    expect(c.professions).toContainEqual({
      name: 'Mining',
      points: 116,
      max: 150,
    });
    expect(c.stats).toContainEqual({ name: 'health', value: '786' });
    expect(c.stats.some((s) => s.name === 'item-level')).toBe(false);
    expect(c.sourceUpdatedAt).not.toEqual(c.checkedAt);
    expect(() =>
      parseCharacterHtml(html({ character: {} }), 'judgement-judy'),
    ).toThrow();
    expect(() =>
      parseCharacterHtml(
        '<script>throw new Error()</script>',
        'judgement-judy',
      ),
    ).toThrow();
    expect(() =>
      parseCharacterHtml(html(profile), 'another-character'),
    ).toThrow();
  });

  it('normalizes names and restricts links to the Forever EU Armory', () => {
    expect(characterSlug(' Judgement Judy ')).toBe('judgement-judy');
    expect(
      characterSlug(
        'https://worldofwarcraft.blizzard.com/en-gb/forever/eu/armory/character/judgement-judy',
      ),
    ).toBe('judgement-judy');
    for (const input of [
      'https://evil.example/forever/eu/armory/character/a-b',
      '../../a-b',
      'single',
      'https://worldofwarcraft.blizzard.com/en-us/forever/us/armory/character/a-b',
    ])
      expect(() => characterSlug(input)).toThrow();
  });

  it('reads profiles whose Armory response omits talent data', () => {
    // Nytheris Moonwhisper's level-12 profile omits specs entirely.
    const data = {
      ...profile,
      character: {
        ...profile.character,
        name: 'Nytheris',
        surname: 'Moonwhisper',
        slug: 'nytheris-moonwhisper',
        level: 12,
        specs: undefined,
      },
    };
    const c = parseCharacterHtml(html(data), 'nytheris-moonwhisper');
    expect(c).toMatchObject({
      name: 'Nytheris Moonwhisper',
      level: 12,
      talents: [],
      specialization: null,
    });
    expect(characterChanges(character(), c)).not.toContainEqual(
      expect.stringContaining('Specialization:'),
    );
    expect(
      parseCharacterHtml(
        html({ ...data, character: { ...data.character, specs: 'invalid' } }),
        'nytheris-moonwhisper',
      ).unavailableFields,
    ).toContain('talents');
  });

  it('reads profiles whose Armory response omits stats and isolates malformed optional data', () => {
    // Nytheris Moonwhisper's level-14 profile omits stats entirely.
    const data = {
      ...profile,
      character: {
        ...profile.character,
        name: 'Nytheris',
        surname: 'Moonwhisper',
        slug: 'nytheris-moonwhisper',
        level: 14,
        stats: undefined,
      },
    };
    const c = parseCharacterHtml(html(data), 'nytheris-moonwhisper');
    expect(c).toMatchObject({
      name: 'Nytheris Moonwhisper',
      level: 14,
      stats: [],
    });
    expect(c.guild).toBe(character().guild);
    expect(c.talents).toEqual(character().talents);
    expect(c.professions).toEqual(character().professions);
    expect(c.pvp).toEqual(character().pvp);
    for (const stats of [null, 'invalid', {}, { groups: 'invalid' }]) {
      const partial = parseCharacterHtml(
        html({ ...data, character: { ...data.character, stats } }),
        'nytheris-moonwhisper',
      );
      expect(partial.stats).toEqual([]);
      expect(partial.unavailableFields).toContain('stats');
    }
  });

  it('reads unguilded profiles whose Armory response omits the guild field', () => {
    const data = {
      ...profile,
      character: {
        ...profile.character,
        name: 'Lepidoptera',
        surname: 'Viridis',
        slug: 'lepidoptera-viridis',
        level: 26,
        guild: undefined,
      },
    };
    const c = parseCharacterHtml(html(data), 'lepidoptera-viridis');
    expect(c).toMatchObject({
      name: 'Lepidoptera Viridis',
      level: 26,
      guild: null,
    });
    expect(c.unavailableFields).toContain('guild');
    expect(
      characterChanges(character(), c).some((change) =>
        change.startsWith('Guild:'),
      ),
    ).toBe(false);
    expect(
      parseCharacterHtml(
        html({ ...data, character: { ...data.character, guild: {} } }),
        'lepidoptera-viridis',
      ).unavailableFields,
    ).toContain('guild');
  });

  it('reports only level, guild and dominant specialization changes', () => {
    const before = character();
    const after = structuredClone(before);
    after.stats = [{ name: 'health', value: '900' }];
    after.professions[0].points++;
    after.pvp.honorableKills = 30;
    after.talents[1].points++;
    expect(characterChanges(before, after)).toEqual([]);
    after.level = 28;
    after.guild = null;
    after.specialization = 'holy';
    expect(characterChanges(before, after)).toEqual([
      'Level: **25 → 28**',
      'Guild: **Circle of Lore → None**',
      'Specialization: **Retribution → Holy**',
    ]);
    after.sourceUpdatedAt = '2026-11-08T00:00:00Z';
    expect(characterChanges(before, after)).toEqual([]);
  });

  it('lists all changed card values, including professions, alongside notification reasons', () => {
    const before = character();
    const after = structuredClone(before);
    after.level++;
    after.guild = null;
    after.professions = before.professions.map((p) =>
      p.name === 'Mining' ? { ...p, points: p.points + 2, max: 225 } : p,
    );
    after.talents[0].points++;
    after.pvp.rank = 1;
    after.pvp.honorableKills = 5;
    after.faction = 'Horde';
    after.race = 'Orc';
    after.class = 'Shaman';
    after.ruleset = 'PvP';
    const differences = characterDifferences(before, after);
    expect(differences).toEqual(
      expect.arrayContaining([
        'Level: **25 → 26**',
        'Guild: **Circle of Lore → None**',
        'Profession (Mining): **116/150 → 118/225**',
        'Talent points (Holy): **4 → 5**',
        'PvP rank: **0 → 1**',
        'Honorable kills: **0 → 5**',
        'Faction: **Alliance → Horde**',
        'Race: **Human → Orc**',
        'Class: **Paladin → Shaman**',
        'Ruleset: **Normal → PvP**',
      ]),
    );
    expect(differences).toHaveLength(10);
  });

  it('compares learned and removed professions by name, not their array position', () => {
    const before = character();
    const after = structuredClone(before);
    after.professions = [...after.professions].reverse();
    after.talents = [...after.talents].reverse();
    after.stats = [{ name: 'health', value: '900' }];
    after.checkedAt = '2026-11-10T18:00:00Z';
    after.sourceUpdatedAt = after.checkedAt;
    expect(characterDifferences(before, after)).toEqual([]);
    after.professions = after.professions.filter((p) => p.name !== 'Mining');
    after.professions.push({ name: 'Alchemy', points: 1, max: 75 });
    expect(characterDifferences(before, after)).toEqual([
      'Profession (Alchemy): **Not learned → 1/75**',
      'Profession (Mining): **116/150 → Not learned**',
    ]);
    after.sourceUpdatedAt = '2026-11-08T00:00:00Z';
    expect(characterDifferences(before, after)).toEqual([]);
  });

  it('does not announce ties or an empty talent reset as a specialization', () => {
    const copy = structuredClone(profile);
    copy.character.specs[0].spentPoints = 12;
    expect(
      parseCharacterHtml(html(copy), 'judgement-judy').specialization,
    ).toBeNull();
    const after = character();
    after.specialization = null;
    expect(characterChanges(character(), after)).toEqual([]);
  });

  it('compares realm slugs and rejects errors, partial or duplicate data', () => {
    const before = parseRealmStatus(realms);
    expect(realmChanges(before, [...before].reverse())).toEqual([]);
    const after = before.map((r) => ({ ...r, online: r.slug !== 'pvp' }));
    expect(realmChanges(before, after)).toEqual(['**PvP**: 🔴 offline']);
    for (const input of [
      { errors: [{}], data: { Realms: before } },
      { data: { Realms: [] } },
      { data: { Realms: [before[0], before[0]] } },
      {
        data: {
          Realms: before.map((r) => ({
            ...r,
            isRuleset: true,
            online: 'true',
          })),
        },
      },
    ])
      expect(() => parseRealmStatus(input)).toThrow();
  });

  it('requires three distinct players and explicit EU evidence', () => {
    const initial = initialForum(time(0));
    expect(
      tick(initial, [post(1, 1), post(2, 1), post(3, 2)], 10).events,
    ).toEqual([]);
    expect(
      tick(
        initial,
        reports.map((p) => ({ ...p, text: 'Cannot log in on US servers' })),
        10,
      ).events,
    ).toEqual([]);
    const result = tick(initial, reports, 10);
    expect(result.events.map((e) => e.kind)).toEqual(['reports']);
    expect(tick(result.state, reports, 15).events).toEqual([]);
    expect(tick(initialForum(time(6)), reports, 10).events).toEqual([]);
    expect(
      tick(
        initial,
        reports.map((p) => ({
          ...p,
          text: 'No login problems on EU servers, I can login now',
        })),
        10,
      ).events,
    ).toEqual([]);
  });

  it('recognizes a staff resolution edited into an existing current-wave post', () => {
    const state = tick(initialForum(time(0)), reports, 10).state;
    const staff = post(8, 8, 11, {
      text: 'We are investigating login issues',
      staff: true,
      updatedAt: time(11),
    });
    const confirmed = tick(state, [staff], 15);
    const resolved = tick(
      confirmed.state,
      [
        {
          ...staff,
          text: 'Login issues are now resolved',
          updatedAt: time(16),
        },
      ],
      20,
    );
    expect(resolved.events.map((e) => e.kind)).toEqual(['resolved']);
  });

  it('does not trust players, old staff replies, unrelated threads or negated recoveries', () => {
    const state = tick(initialForum(time(0)), reports, 10).state;
    const candidates = [
      post(4, 4, 11, { text: 'Login issues are now resolved', staff: false }),
      post(5, 5, 4, { text: 'Login issues are now resolved', staff: true }),
      post(6, 6, 11, {
        text: 'Login issues are now resolved',
        staff: true,
        topicId: 99,
      }),
      post(7, 7, 11, {
        text: 'Login issues are not resolved yet',
        staff: true,
      }),
    ];
    expect(tick(state, candidates, 15).events).toEqual([]);
    const confirmed = tick(
      state,
      [
        post(8, 8, 11, {
          text: 'We are investigating login issues',
          staff: true,
        }),
      ],
      15,
    );
    expect(confirmed.events.map((e) => e.kind)).toEqual(['confirmed']);
    const resolved = tick(
      confirmed.state,
      [post(9, 9, 16, { text: 'Login issues are now resolved', staff: true })],
      20,
    );
    expect(resolved.events.map((e) => e.kind)).toEqual(['resolved']);
    expect(
      tick(
        resolved.state,
        [
          post(9, 9, 16, {
            text: 'Login issues are now resolved',
            staff: true,
          }),
        ],
        25,
      ).events,
    ).toEqual([]);
  });

  it('opens a new wave after 60 monitored quiet minutes without inventing a recovery', () => {
    let state = tick(initialForum(time(0)), reports, 10).state;
    for (let m = 15; m <= 70; m += 5) {
      const result = tick(state, [], m);
      expect(result.events).toEqual([]);
      state = result.state;
    }
    expect(state.alerted).toBe(false);
    expect(
      tick(
        state,
        [post(10, 10, 72), post(11, 11, 72), post(12, 12, 72)],
        75,
      ).events.map((e) => e.kind),
    ).toEqual(['reports']);
  });

  it('does not count source downtime as quiet time', () => {
    const state = tick(initialForum(time(0)), reports, 10).state;
    const recovery = tick(state, [], 100, true);
    expect(recovery.state.alerted).toBe(true);
    expect(recovery.events).toEqual([]);
    expect(tick(recovery.state, [], 105).state.alerted).toBe(true);
  });

  it('ignores quoted reports and decodes text without evaluating HTML', () => {
    expect(
      forumText(
        '<aside class="quote"><blockquote>EU cannot login</blockquote></aside><p>Thanks &amp; welcome</p>',
      ),
    ).toBe('Thanks & welcome');
  });
});
