import { describe, expect, it, jest } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { Client } from 'discord.js';
import { of } from 'rxjs';
import { AxiosHeaders } from 'axios';
import { parseCharacterHtml } from './wow-parser';
import {
  characterBaseline,
  characterChanges,
  characterDifferences,
} from './wow-signals';
import { WowSourceService } from './wow-source.service';
import { WowEmbedService } from './wow-embed.service';

const fixture = JSON.parse(
  readFileSync(join(__dirname, '__fixtures__/character.json'), 'utf8'),
) as { character: Record<string, unknown> };
const html = (fields: Record<string, unknown>) =>
  `<script id="character-profile-mount-initial-state">var characterProfileInitialState = ${JSON.stringify({ character: { ...fixture.character, ...fields } })};</script>`;
const parse = (fields: Record<string, unknown> = {}) =>
  parseCharacterHtml(html(fields), 'judgement-judy');
const optional = [
  'guild',
  'race',
  'class',
  'faction',
  'ruleset',
  'specs',
  'stats',
  'professions',
  'pvp',
  'lastUpdatedTimestamp',
  'avatar',
];

describe('Partial Armory profiles', () => {
  it.each(
    optional.flatMap((field) =>
      [undefined, null, 'unexpected-data', {}].map((value) => ({
        field,
        value,
      })),
    ),
  )(
    'keeps identity readable when optional $field is $value',
    ({ field, value }) => {
      const c = parse({ [field]: value });
      expect(c).toMatchObject({
        name: 'Judgement Judy',
        level: 25,
        slug: 'judgement-judy',
      });
      expect(Array.isArray(c.professions)).toBe(true);
      expect(Array.isArray(c.stats)).toBe(true);
      expect(Array.isArray(c.talents)).toBe(true);
    },
  );

  it('renders a valid card when all optional details are unavailable, without inventing freshness or an empty guild', () => {
    const c = parse(
      Object.fromEntries(optional.map((key) => [key, undefined])),
    );
    const client = new Client({ intents: [] });
    const embeds = new WowEmbedService(
      client,
      new ConfigService({
        discord: { colors: { info: 0x123456 }, botName: 'Test' },
      }),
    ).character(c);
    const data = JSON.stringify(embeds.map((e) => e.toJSON()));
    expect(data).toContain('No guild data available');
    expect(data).toContain('No profession data available');
    expect(data).toContain('Partial Armory data');
    expect(data).toContain('Not provided by Armory');
    expect(data).not.toContain('NaN');
    expect(c.sourceUpdatedAt).toBeNull();
  });

  it.each([
    ['Druid', 'Night Elf', 'Feral Combat', 'Alchemy'],
    ['Shaman', 'Orc', 'Elemental', 'Leatherworking'],
    ['Mage', 'Gnome', 'Frost', 'Engineering'],
    ['Priest', 'Dwarf', 'Discipline', 'Tailoring'],
    ['Warrior', 'Tauren', 'Protection', 'Blacksmithing'],
    ['Unlisted class', 'Unlisted race', 'New talent tree', 'New profession'],
  ])(
    'reads %s / %s using data-driven labels, numeric strings and additional source fields',
    (characterClass, race, tree, profession) => {
      const c = parse({
        level: '25',
        class: { name: characterClass },
        race,
        specs: [{ id: tree, name: tree, spentPoints: '12', extra: true }],
        stats: {
          groups: [
            {
              stats: [
                {
                  slug: 'new-stat',
                  value: { type: 'PERCENTAGE', value: '4.25' },
                },
                {
                  slug: 'weapon-range',
                  value: {
                    type: 'RANGE',
                    min: { value: '2' },
                    max: { value: 5 },
                  },
                },
              ],
            },
          ],
        },
        professions: {
          primaries: [
            {
              name: profession,
              tiers: [{ skillPoints: '37', maxSkillPoints: '75' }],
            },
          ],
          secondaries: [],
        },
        pvp: { rank: { value: '2' }, honorableKills: { value: '10' } },
        unrecognizedSourceField: { value: 'ignored' },
      });
      expect(c).toMatchObject({
        class: characterClass,
        race,
        level: 25,
        specialization: tree,
        professions: [{ name: profession, points: 37, max: 75 }],
        pvp: { rank: 2, honorableKills: 10 },
      });
      expect(c.stats).toEqual([
        { name: 'new-stat', value: '4.25%' },
        { name: 'weapon-range', value: '2–5' },
      ]);
    },
  );

  it('keeps valid scalar stats with empty range placeholders and skips legitimately valueless stats', () => {
    const c = parse({
      stats: {
        groups: [
          {
            stats: [
              {
                slug: 'health',
                value: { type: 'NUMBER', value: 123, min: {}, max: {} },
              },
              { slug: 'not-applicable', value: { type: 'NUMBER' } },
            ],
          },
        ],
      },
    });
    expect(c.stats).toEqual([{ name: 'health', value: '123' }]);
    expect(c.unavailableFields).not.toContain('stats');
  });

  it('preserves valid entries beside malformed talents, stats, profession tiers and PvP values', () => {
    const c = parse({
      specs: [
        null,
        { id: 'frost', name: 'Frost', spentPoints: 12 },
        { id: 'bad', name: 'Bad', spentPoints: -1 },
      ],
      stats: {
        groups: [
          null,
          {
            stats: [
              null,
              { slug: 'health', value: { type: 'NUMBER', value: 123 } },
            ],
          },
        ],
      },
      professions: {
        primaries: [
          {
            name: 'Mining',
            tiers: [null, { skillPoints: 35, maxSkillPoints: 75 }],
          },
        ],
        secondaries: [],
      },
      pvp: { rank: { value: true }, honorableKills: { value: 15 } },
    });
    expect(c.talents).toEqual([{ id: 'frost', name: 'Frost', points: 12 }]);
    expect(c.specialization).toBeNull(); // A missing tree must not produce a false dominant specialization.
    expect(c.stats).toEqual([{ name: 'health', value: '123' }]);
    expect(c.professions).toEqual([{ name: 'Mining', points: 35, max: 75 }]);
    expect(c.pvp).toEqual({ rank: null, honorableKills: 15 });
    expect(c.unavailableFields).toEqual(
      expect.arrayContaining(['talents', 'stats', 'professions', 'pvp']),
    );
  });

  it.each([
    { name: '' },
    { surname: null },
    { slug: 'different-character' },
    { level: 'bad' },
    { level: 9 },
    { region: 'us' },
  ])('still rejects invalid identity: %j', (fields) => {
    expect(() => parse(fields)).toThrow();
  });

  it('retains last-known guild and talents through a partial read, then detects a real change after recovery', () => {
    const before = parse();
    const partial = parse({
      guild: {},
      specs: null,
      professions: null,
      pvp: null,
      race: null,
    });
    expect(characterChanges(before, partial)).toEqual([]);
    expect(characterDifferences(before, partial)).toEqual([]);
    const baseline = characterBaseline(before, partial);
    expect(baseline.guild).toBe(before.guild);
    expect(baseline.talents).toEqual(before.talents);
    expect(baseline.unavailableFields).not.toContain('guild');
    const recovered = parse({
      guild: { name: 'New guild' },
      specs: [{ id: 'holy', name: 'Holy', spentPoints: 12 }],
    });
    expect(characterChanges(baseline, recovered)).toEqual(
      expect.arrayContaining([
        'Guild: **Circle of Lore → New guild**',
        'Specialization: **Retribution → Holy**',
      ]),
    );
    const first = characterBaseline(null, partial);
    expect(characterChanges(first, parse())).toEqual([]);
    expect(characterChanges(before, parse({ guild: null }))).toContain(
      'Guild: **Circle of Lore → None**',
    );
  });

  it('logs partial-profile section names without dumping source values', async () => {
    const http = new HttpService();
    jest.spyOn(http, 'get').mockReturnValue(
      of({
        data: html({ professions: 'private-source-value', stats: null }),
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: new AxiosHeaders() },
      }),
    );
    const warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    try {
      const c = await new WowSourceService(http).character('Judgement Judy');
      expect(c.name).toBe('Judgement Judy');
      const log = warn.mock.calls.flat().join(' ');
      expect(log).toContain('Partial Armory profile');
      expect(log).toContain('professions');
      expect(log).not.toContain('private-source-value');
    } finally {
      jest.restoreAllMocks();
    }
  });
});
