import { z } from 'zod';
import {
  WOW_EU_BASE,
  WowCharacter,
  WowCharacterSection,
  WowRealm,
  WowSourceError,
} from '@Types/wow/wow.type';

const name = z.string().trim().min(1).max(200);
const number = z
  .union([
    z.number(),
    z
      .string()
      .regex(/^-?\d+(?:\.\d+)?$/)
      .transform(Number),
  ])
  .pipe(z.number().finite());
const label = z.union([name, z.object({ name }).transform((v) => v.name)]);
const record = z.record(z.string(), z.unknown());
const numericValue = z.object({ value: number });
const stat = z.object({
  slug: name,
  value: z.object({
    type: name,
    value: number.optional(),
    min: z.object({ value: number.optional() }).optional(),
    max: z.object({ value: number.optional() }).optional(),
  }),
});
const talent = z.object({
  id: z.union([name, z.number().int().nonnegative().transform(String)]),
  name,
  spentPoints: number.pipe(z.number().int().nonnegative()),
});
const tier = z.object({
  skillPoints: number.pipe(z.number().nonnegative()),
  maxSkillPoints: number.pipe(z.number().nonnegative()),
});
// Only identity is required. Optional sections are read independently below.
const characterSchema = z.object({
  character: z
    .object({
      name,
      surname: name,
      slug: z.string().min(1).max(120),
      level: number.pipe(z.number().int().min(10)),
      region: z.literal('eu'),
    })
    .passthrough(),
});

export function characterSlug(input: string): string {
  let value = input.trim();
  if (/^https?:/i.test(value)) {
    const url = new URL(value);
    if (
      url.origin !== 'https://worldofwarcraft.blizzard.com' ||
      !/^\/[^/]+\/forever\/eu\/armory\/character\/[^/]+\/?$/.test(url.pathname)
    ) {
      throw new WowSourceError(
        'Enter a character name or a Forever EU Armory profile URL.',
      );
    }
    value = decodeURIComponent(url.pathname.split('/').filter(Boolean).at(-1)!);
  }
  value = value.normalize('NFKC').toLowerCase().replace(/\s+/g, '-');
  if (!/^[\p{L}][\p{L}'-]{1,100}$/u.test(value) || !value.includes('-')) {
    throw new WowSourceError(
      "Enter the character's first and last name, for example Judgement Judy.",
    );
  }
  return value;
}

export function parseCharacterHtml(
  html: string,
  expectedSlug: string,
  checkedAt = new Date().toISOString(),
): WowCharacter {
  const script = html.match(
    /<script\b[^>]*\bid=["']character-profile-mount-initial-state["'][^>]*>([\s\S]*?)<\/script>/i,
  )?.[1];
  const json = script
    ?.trim()
    .replace(/^var characterProfileInitialState\s*=\s*/, '')
    .replace(/;\s*$/, '');
  if (!json || !script?.trim().startsWith('var characterProfileInitialState')) {
    throw new WowSourceError(
      'Armory did not return a valid character profile.',
    );
  }
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch (error) {
    throw new WowSourceError('Could not read the Armory data.', false, error);
  }
  const result = characterSchema.safeParse(data);
  if (!result.success) {
    throw new WowSourceError(
      'The Armory data format has changed.',
      false,
      result.error,
    );
  }
  const c = result.data.character;
  if (c.slug !== expectedSlug) {
    throw new WowSourceError(
      'Armory returned a different character than requested.',
    );
  }
  const unavailable = new Set<WowCharacterSection>();
  const read = <T>(
    schema: z.ZodType<T>,
    raw: unknown,
    field: WowCharacterSection,
    fallback: T,
  ): T => {
    const result = schema.safeParse(raw);
    if (result.success) return result.data;
    unavailable.add(field);
    return fallback;
  };
  const list = <T>(
    schema: z.ZodType<T>,
    raw: unknown,
    field: WowCharacterSection,
  ): T[] => {
    if (!Array.isArray(raw)) {
      unavailable.add(field);
      return [];
    }
    return raw.flatMap((item: unknown) => {
      const result = schema.safeParse(item);
      if (result.success) return [result.data];
      unavailable.add(field);
      return [];
    });
  };
  const talents = list(talent, c.specs, 'talents').map((s) => ({
    id: s.id,
    name: s.name,
    points: s.spentPoints,
  }));
  const maxPoints = Math.max(0, ...talents.map((s) => s.points));
  const dominant = talents.filter((s) => s.points === maxPoints);
  const rawStats = read(record, c.stats, 'stats', {});
  const stats = list(
    z.object({ stats: z.unknown() }),
    rawStats.groups,
    'stats',
  ).flatMap((group) =>
    list(stat, group.stats, 'stats')
      .filter((s) => s.slug !== 'item-level')
      .flatMap((s) => {
        const v = s.value;
        const value =
          v.value !== undefined
            ? `${Number(v.value.toFixed(2))}${v.type === 'PERCENTAGE' ? '%' : ''}`
            : v.min?.value !== undefined && v.max?.value !== undefined
              ? `${Number(v.min.value.toFixed(2))}–${Number(v.max.value.toFixed(2))}`
              : null;
        return value === null ? [] : [{ name: s.slug, value }];
      }),
  );
  const rawProfessions = read(record, c.professions, 'professions', {});
  const professions = [
    rawProfessions.primaries,
    rawProfessions.secondaries,
  ].flatMap((group) =>
    list(z.object({ name, tiers: z.unknown() }), group, 'professions').flatMap(
      (p) =>
        list(tier, p.tiers, 'professions').map((t) => ({
          name: p.name,
          points: t.skillPoints,
          max: t.maxSkillPoints,
        })),
    ),
  );
  const rawPvp = read(record, c.pvp, 'pvp', {});
  const honorableKills = read<number | null>(
    numericValue.transform((v) => v.value),
    rawPvp.honorableKills,
    'pvp',
    null,
  );
  const rank = read<number | null>(
    numericValue.transform((v) => v.value),
    rawPvp.rank,
    'pvp',
    null,
  );
  const guild = read(label.nullable(), c.guild, 'guild', null);
  const faction = read(label, c.faction, 'faction', 'Unknown faction');
  const race = read(label, c.race, 'race', 'Unknown race');
  const characterClass = read(label, c.class, 'class', 'Unknown class');
  const ruleset = read(label, c.ruleset, 'ruleset', 'Unknown ruleset');
  const sourceUpdatedAt = read<string | null>(
    z.object({ iso8601: z.iso.datetime() }).transform((v) => v.iso8601),
    c.lastUpdatedTimestamp,
    'sourceUpdatedAt',
    null,
  );
  const avatar =
    c.avatar == null
      ? null
      : read(
          z
            .object({ url: z.url({ protocol: /^https?$/ }) })
            .transform((v) => v.url)
            .nullable(),
          c.avatar,
          'avatar',
          null,
        );
  return {
    slug: c.slug,
    name: `${c.name} ${c.surname}`,
    level: c.level,
    guild,
    faction,
    race,
    class: characterClass,
    ruleset,
    talents,
    specialization:
      !unavailable.has('talents') && maxPoints > 0 && dominant.length === 1
        ? dominant[0].id
        : null,
    stats,
    professions,
    pvp: { honorableKills, rank },
    sourceUpdatedAt,
    checkedAt,
    url: `${WOW_EU_BASE}/armory/character/${encodeURIComponent(c.slug)}`,
    avatar,
    unavailableFields: [...unavailable],
  };
}

export function parseRealmStatus(data: unknown): WowRealm[] {
  const result = z
    .object({
      errors: z.array(z.unknown()).optional(),
      data: z.object({
        Realms: z.array(
          z.object({
            slug: z.string(),
            name: z.string().min(1),
            isRuleset: z.literal(true),
            online: z.boolean(),
          }),
        ),
      }),
    })
    .safeParse(data);
  if (!result.success || result.data.errors?.length) {
    throw new WowSourceError(
      'Could not read the official EU realm status.',
      false,
      result.success ? undefined : result.error,
    );
  }
  const realms = result.data.data.Realms;
  const expected = ['normal', 'pvp', 'roleplay', 'roleplay-pvp'];
  if (
    realms.length !== expected.length ||
    !expected.every(
      (slug) => realms.filter((r) => r.slug === slug).length === 1,
    )
  ) {
    throw new WowSourceError('Official EU realm status data is incomplete.');
  }
  return realms
    .map(({ slug, name, online }) => ({ slug, name, online }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
}
