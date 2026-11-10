import { z } from 'zod';
import {
  WOW_EU_BASE,
  WowCharacter,
  WowRealm,
  WowSourceError,
} from '@Types/wow/wow.type';

const label = z.object({ name: z.string().min(1) });
const numericValue = z.object({ value: z.number().finite().optional() });
const stat = z.object({
  slug: z.string(),
  value: z.object({
    type: z.string(),
    value: z.number().finite().optional(),
    min: numericValue.optional(),
    max: numericValue.optional(),
  }),
});
const profession = z.object({
  name: z.string(),
  tiers: z.array(
    z.object({
      skillPoints: z.number().nonnegative(),
      maxSkillPoints: z.number().nonnegative(),
    }),
  ),
});
const characterSchema = z.object({
  character: z.object({
    name: z.string().min(1),
    surname: z.string().min(1),
    slug: z.string().min(1),
    level: z.number().int().min(10),
    region: z.literal('eu'),
    guild: label.nullable().default(null),
    faction: label,
    race: label,
    class: label,
    ruleset: label,
    specs: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          spentPoints: z.number().int().nonnegative(),
        }),
      )
      .default([]),
    stats: z.object({
      groups: z.array(z.object({ name: z.string(), stats: z.array(stat) })),
    }),
    professions: z.object({
      primaries: z.array(profession),
      secondaries: z.array(profession),
    }),
    pvp: z.object({
      honorableKills: numericValue.optional(),
      rank: numericValue.optional(),
    }),
    lastUpdatedTimestamp: z.object({ iso8601: z.iso.datetime() }),
    avatar: z.object({ url: z.url() }).nullable().optional(),
  }),
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
  const talents = c.specs.map((s) => ({
    id: s.id,
    name: s.name,
    points: s.spentPoints,
  }));
  const maxPoints = Math.max(0, ...talents.map((s) => s.points));
  const dominant = talents.filter((s) => s.points === maxPoints);
  return {
    slug: c.slug,
    name: `${c.name} ${c.surname}`,
    level: c.level,
    guild: c.guild?.name ?? null,
    faction: c.faction.name,
    race: c.race.name,
    class: c.class.name,
    ruleset: c.ruleset.name,
    talents,
    specialization:
      maxPoints > 0 && dominant.length === 1 ? dominant[0].id : null,
    stats: c.stats.groups.flatMap((g) =>
      g.stats
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
    ),
    professions: [
      ...c.professions.primaries,
      ...c.professions.secondaries,
    ].flatMap((p) =>
      p.tiers.map((t) => ({
        name: p.name,
        points: t.skillPoints,
        max: t.maxSkillPoints,
      })),
    ),
    pvp: {
      honorableKills: c.pvp.honorableKills?.value ?? null,
      rank: c.pvp.rank?.value ?? null,
    },
    sourceUpdatedAt: c.lastUpdatedTimestamp.iso8601,
    checkedAt,
    url: `${WOW_EU_BASE}/armory/character/${encodeURIComponent(c.slug)}`,
    avatar: c.avatar?.url ?? null,
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
