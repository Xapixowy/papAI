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
        { name: 'Poziom', value: String(c.level), inline: true },
        { name: 'Gildia', value: fit(text(c.guild ?? 'Brak')), inline: true },
        {
          name: 'Postać',
          value: fit(
            `${text(c.race)} · ${text(c.class)} · ${text(c.faction)}\nEU · ${text(c.ruleset)}`,
          ),
          inline: false,
        },
        {
          name: 'Specjalizacja / talenty',
          value: fit(
            c.talents
              .map(
                (s) =>
                  `${text(s.name)}: **${s.points}**${s.id === c.specialization ? ' ★' : ''}`,
              )
              .join(' · ') || 'Brak rozłożonych talentów',
          ),
        },
        {
          name: 'Statystyki',
          value: fit(
            c.stats.map((s) => `${text(s.name)}: **${s.value}**`).join(' · ') ||
              'Brak danych',
          ),
        },
        {
          name: 'Profesje',
          value: fit(
            c.professions
              .map((p) => `${text(p.name)}: **${p.points}/${p.max}**`)
              .join('\n') || 'Brak profesji',
          ),
        },
        {
          name: 'PvP',
          value: `Ranga: **${c.pvp.rank ?? 'brak danych'}**\nHonorowe zabójstwa: **${c.pvp.honorableKills ?? 'brak danych'}**`,
        },
        {
          name: 'Aktualność',
          value: `Dane Armory: <t:${Math.floor(Date.parse(c.sourceUpdatedAt) / 1000)}:f>\nSprawdzono: <t:${Math.floor(Date.parse(c.checkedAt) / 1000)}:f>`,
        },
      );
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
        `[Oficjalny status EU](${WOW_EU_BASE}/server-status)`,
        'Status realmów nie potwierdza działania logowania.',
      ].join('\n'),
    );
  }

  forum(event: WowForumEvent): EmbedBuilder[] {
    const titles = {
      reports: 'Gracze zgłaszają problemy z logowaniem w EU',
      confirmed: 'Blizzard potwierdza problem z logowaniem',
      resolved: 'Blizzard informuje o usunięciu problemu',
    };
    const links = [...new Map(event.posts.map((p) => [p.topicId, p])).values()]
      .slice(0, 5)
      .map((p) => `[${text(fit(p.title, 160))}](${p.url})`);
    return this.message(
      [
        `**${titles[event.kind]}**`,
        event.kind === 'reports'
          ? 'Niepotwierdzony sygnał od co najmniej 3 różnych graczy w ciągu 15 minut. Nie oznacza, że wszystkie realmy są offline.'
          : 'Komunikat pracownika Blizzard w temacie dotyczącym obserwowanej fali zgłoszeń.',
        '',
        ...links,
      ].join('\n'),
      event.kind === 'resolved' ? 'success' : 'warning',
    );
  }

  forumSummary(state: WowHealthState<WowForumState> | null): EmbedBuilder[] {
    if (!state?.snapshot || state.unavailable)
      return this.message(
        'Sygnał zgłoszeń graczy: brak aktualnych danych monitoringu.',
        'warning',
      );
    const wave = state.snapshot;
    return this.message(
      wave.alerted
        ? wave.resolved
          ? 'Blizzard potwierdził usunięcie problemu z obserwowanej fali zgłoszeń.'
          : `${wave.confirmed ? 'Blizzard potwierdził problem' : 'Gracze zgłosili problemy (niepotwierdzone)'}. Ostatnie pasujące zgłoszenie: <t:${Math.floor(Date.parse(wave.lastReportAt!) / 1000)}:f>.`
        : 'Brak aktywnego alertu ze zgłoszeń graczy. Nie stanowi to potwierdzenia sprawności logowania.',
    );
  }
}
