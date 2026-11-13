import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, EmbedBuilder, escapeMarkdown } from 'discord.js';
import { EmbedBuilderService } from '@Services/discord/embed-builder.service';
import {
  WOW_EU_BASE,
  WowCharacter,
  WowForumState,
  WowHealthState,
  WowRealm,
} from '@Types/wow/wow.type';
import { WowForumEvent } from '@Services/wow/wow-signals';

const fit = (s: string, max = 1024) =>
  s.length > max ? `${s.slice(0, max - 1)}…` : s;
const text = (s: string) => escapeMarkdown(s);

@Injectable()
export class WowEmbedService extends EmbedBuilderService {
  constructor(client: Client, config: ConfigService) {
    super(client, config);
  }

  message(
    description: string,
    variant: 'info' | 'success' | 'warning' | 'error' = 'info',
  ): EmbedBuilder[] {
    return this.simple({ title: 'WoW: Forever EU', description, variant });
  }

  character(c: WowCharacter, changes: string[] = []): EmbedBuilder[] {
    const embed = this.message(
      changes.length
        ? changes.join('\n')
        : `${text(c.race)} · ${text(c.class)} · ${text(c.faction)} · ${text(c.ruleset)}`,
    )[0]
      .setTitle(fit(c.name, 256))
      .setURL(c.url)
      .addFields(
        { name: 'Level', value: String(c.level), inline: true },
        {
          name: 'Guild',
          value: fit(
            text(
              c.unavailableFields?.includes('guild')
                ? 'No guild data available'
                : (c.guild ?? 'None'),
            ),
          ),
          inline: true,
        },
        {
          name: 'Character',
          value: fit(
            `${text(c.race)} · ${text(c.class)} · ${text(c.faction)}\nEU · ${text(c.ruleset)}`,
          ),
          inline: false,
        },
        {
          name: 'Specialization / talents',
          value: fit(
            c.talents
              .map(
                (s) =>
                  `${text(s.name)}: **${s.points}**${s.id === c.specialization ? ' ★' : ''}`,
              )
              .join(' · ') || 'No talent data available',
          ),
        },
        {
          name: 'Professions',
          value: fit(
            c.professions
              .map((p) => `${text(p.name)}: **${p.points}/${p.max}**`)
              .join('\n') ||
              (c.unavailableFields?.includes('professions')
                ? 'No profession data available'
                : 'No professions'),
          ),
        },
        {
          name: 'PvP',
          value: `Rank: **${c.pvp.rank ?? 'no data'}**\nHonorable kills: **${c.pvp.honorableKills ?? 'no data'}**`,
        },
        {
          name: 'Data freshness',
          value: `Armory updated: ${c.sourceUpdatedAt ? `<t:${Math.floor(Date.parse(c.sourceUpdatedAt) / 1000)}:f>` : 'Not provided by Armory'}\nChecked: <t:${Math.floor(Date.parse(c.checkedAt) / 1000)}:f>`,
        },
      );
    const labels = {
      guild: 'Guild',
      faction: 'Faction',
      race: 'Race',
      class: 'Class',
      ruleset: 'Ruleset',
      talents: 'Talents',
      professions: 'Professions',
      pvp: 'PvP',
      sourceUpdatedAt: 'Update timestamp',
    };
    const missing = (c.unavailableFields ?? []).flatMap((field) =>
      field in labels ? [labels[field as keyof typeof labels]] : [],
    );
    if (missing.length)
      embed.addFields({
        name: 'Partial Armory data',
        value: `Unavailable or incomplete: ${missing.join(', ')}. Available details are shown above.`,
      });
    if (c.avatar) embed.setThumbnail(c.avatar);
    return [embed];
  }

  realms(realms: WowRealm[], changes: string[] = []): EmbedBuilder[] {
    return this.message(
      [
        ...(changes.length ? [changes.join('\n'), ''] : []),
        ...realms.map(
          (r) =>
            `${r.online ? '🟢' : '🔴'} **${text(r.name)}** — ${r.online ? 'online' : 'offline'}`,
        ),
        '',
        `[Official EU realm status](${WOW_EU_BASE}/server-status)`,
        'Realm status does not confirm that login is working.',
      ].join('\n'),
    );
  }

  forum(event: WowForumEvent): EmbedBuilder[] {
    const titles = {
      reports: 'Players report login issues in EU',
      confirmed: 'Blizzard confirms a login issue',
      resolved: 'Blizzard reports that the issue is resolved',
    };
    const links = [...new Map(event.posts.map((p) => [p.topicId, p])).values()]
      .slice(0, 5)
      .map((p) => `[${text(fit(p.title, 160))}](${p.url})`);
    return this.message(
      [
        `**${titles[event.kind]}**`,
        event.kind === 'reports'
          ? 'Unconfirmed reports from at least 3 different players within 15 minutes. This does not mean all realms are offline.'
          : 'A Blizzard staff update in a topic related to the monitored wave of reports.',
        '',
        ...links,
      ].join('\n'),
      event.kind === 'resolved' ? 'success' : 'warning',
    );
  }

  forumSummary(state: WowHealthState<WowForumState> | null): EmbedBuilder[] {
    if (!state?.snapshot || state.unavailable)
      return this.message(
        'Player reports: current monitoring data is unavailable.',
        'warning',
      );
    const wave = state.snapshot;
    return this.message(
      wave.alerted
        ? wave.resolved
          ? 'Blizzard has confirmed that the issue from the monitored wave of reports is resolved.'
          : `${wave.confirmed ? 'Blizzard has confirmed the issue' : 'Players have reported issues (unconfirmed)'}. Latest matching report: <t:${Math.floor(Date.parse(wave.lastReportAt!) / 1000)}:f>.`
        : 'No active alert from player reports. This does not confirm that login is working.',
    );
  }
}
