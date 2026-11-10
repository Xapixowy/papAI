import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Client, EmbedBuilder, Events } from 'discord.js';
import { DataSource, LessThan } from 'typeorm';
import { DiscordChannel } from '@Database/entities/discord-channel.entity';
import { DiscordGuild } from '@Database/entities/discord-guild.entity';
import { WowObserver } from '@Database/entities/wow-observer.entity';
import { WowStatusWatch } from '@Database/entities/wow-status-watch.entity';
import { WowNotification } from '@Database/entities/wow-notification.entity';
import { WowMonitorState } from '@Database/entities/wow-monitor-state.entity';
import { DiscordFeature } from '@Enums/discord/discord-feature.enum';
import { CronjobName } from '@Enums/cronjob-name.enum';
import {
  WowCharacter,
  WowForumSnapshot,
  WowForumState,
  WowHealthState,
  WowRealm,
} from '@Types/wow/wow.type';
import { WowSourceService } from '@Services/wow/wow-source.service';
import { WowForumService } from '@Services/wow/wow-forum.service';
import { WowEmbedService } from '@Services/wow/wow-embed.service';
import {
  initialHealth,
  WowStoreService,
} from '@Services/wow/wow-store.service';
import {
  characterChanges,
  forumSignals,
  realmChanges,
} from '@Services/wow/wow-signals';

type Target = Pick<
  WowNotification,
  'guildId' | 'channelId' | 'kind' | 'characterSlug'
>;
type Update<T> = { snapshot: T; messages: EmbedBuilder[][] };

export const characterStateKey = (
  guild: string,
  channel: string,
  slug: string,
) => `character:${guild}:${channel}:${slug}`;
export const realmStateKey = (guild: string, channel: string) =>
  `realms:${guild}:${channel}`;
export const forumStateKey = (guild: string, channel: string) =>
  `forum:${guild}:${channel}`;
export const initialForum = (
  startedAt = new Date().toISOString(),
): WowForumState => ({
  startedAt,
  lastReportAt: null,
  waveStartedAt: null,
  alerted: false,
  confirmed: false,
  resolved: false,
  topicIds: [],
  seenStaffRevisions: [],
  continuousSince: null,
  lastCheckedAt: null,
});

@Injectable()
export class WowMonitorService implements OnApplicationBootstrap {
  private readonly logger = new Logger(WowMonitorService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly store: WowStoreService,
    private readonly source: WowSourceService,
    private readonly forum: WowForumService,
    private readonly embeds: WowEmbedService,
    private readonly client: Client,
  ) {}

  onApplicationBootstrap(): void {
    const start = async () => {
      await this.pollStatus();
      await this.pollCharacters();
      await this.dispatch();
    };
    if (this.client.isReady()) void start();
    else this.client.once(Events.ClientReady, () => void start());
  }

  async activeObservers(): Promise<WowObserver[]> {
    return this.dataSource
      .getRepository(WowObserver)
      .createQueryBuilder('o')
      .innerJoin(DiscordGuild, 'g', 'g.id = o.guildId')
      .innerJoin(
        DiscordChannel,
        'c',
        'c.id = o.channelId AND c.discordGuildId = o.guildId',
      )
      .where(':feature = ANY(g.features::text[])', {
        feature: DiscordFeature.WOW_FOREVER,
      })
      .andWhere("c.features ->> :feature = 'true'")
      .getMany();
  }

  async activeWatches(): Promise<WowStatusWatch[]> {
    return this.dataSource
      .getRepository(WowStatusWatch)
      .createQueryBuilder('w')
      .innerJoin(DiscordGuild, 'g', 'g.id = w.guildId')
      .innerJoin(
        DiscordChannel,
        'c',
        'c.id = w.channelId AND c.discordGuildId = w.guildId',
      )
      .where(':feature = ANY(g.features::text[])', {
        feature: DiscordFeature.WOW_FOREVER,
      })
      .getMany();
  }

  @Cron('*/5 * * * *', {
    name: CronjobName.WOW_STATUS_CHECK,
    waitForCompletion: true,
  })
  async pollStatus(): Promise<void> {
    if (!this.client.isReady()) return;
    await this.safely('status', async () =>
      this.store.lock('wow:status-poll', async () => {
        const watches = await this.activeWatches();
        if (!watches.length) return;
        const states = await this.dataSource
          .getRepository(WowMonitorState)
          .findBy(
            watches.map((w) => ({
              key: forumStateKey(w.guildId, w.channelId),
            })),
          );
        const tracked = states.flatMap(
          (s) =>
            (s.data as WowHealthState<WowForumState>).snapshot?.topicIds ?? [],
        );
        const [realms, reports] = await Promise.allSettled([
          this.source.realms(),
          this.forum.read([...new Set(tracked)]),
        ]);
        for (const watch of watches) {
          const target: Target = {
            guildId: watch.guildId,
            channelId: watch.channelId,
            kind: 'status',
            characterSlug: null,
          };
          await this.record<WowRealm[]>(
            realmStateKey(watch.guildId, watch.channelId),
            target,
            realms,
            (before, after) => {
              const changes = before ? realmChanges(before, after) : [];
              return {
                snapshot: after,
                messages: changes.length
                  ? [this.embeds.realms(after, changes)]
                  : [],
              };
            },
          );
          await this.record<WowForumState, WowForumSnapshot>(
            forumStateKey(watch.guildId, watch.channelId),
            target,
            reports,
            (before, after, interrupted) => {
              const result = forumSignals(
                before ?? initialForum(after.checkedAt),
                after,
                interrupted,
              );
              return {
                snapshot: result.state,
                messages: result.events.map((e) => this.embeds.forum(e)),
              };
            },
          );
        }
      }),
    );
    await this.dispatch();
  }

  @Cron('*/15 * * * *', {
    name: CronjobName.WOW_CHARACTER_CHECK,
    waitForCompletion: true,
  })
  async pollCharacters(): Promise<void> {
    if (!this.client.isReady()) return;
    await this.safely('characters', async () =>
      this.store.lock('wow:character-poll', async () => {
        const observers = await this.activeObservers();
        const slugs = [...new Set(observers.map((o) => o.characterSlug))];
        for (const slug of slugs) {
          const [result] = await Promise.allSettled([
            this.source.character(slug),
          ]);
          const groups = new Map(
            observers
              .filter((o) => o.characterSlug === slug)
              .map((o) => [characterStateKey(o.guildId, o.channelId, slug), o]),
          );
          for (const [key, o] of groups) {
            await this.record<WowCharacter>(
              key,
              {
                guildId: o.guildId,
                channelId: o.channelId,
                characterSlug: slug,
                kind: 'character',
              },
              result,
              (before, after) => {
                if (
                  before &&
                  Date.parse(after.sourceUpdatedAt) <
                    Date.parse(before.sourceUpdatedAt)
                )
                  return { snapshot: before, messages: [] };
                const changes = before ? characterChanges(before, after) : [];
                // Keep the last unambiguous tree through a tie or an empty reset.
                const snapshot = {
                  ...after,
                  specialization:
                    after.specialization ?? before?.specialization ?? null,
                };
                return {
                  snapshot,
                  messages: changes.length
                    ? [this.embeds.character(after, changes)]
                    : [],
                };
              },
            );
          }
        }
      }),
    );
    await this.dispatch();
  }

  private async record<T, R = T>(
    key: string,
    target: Target,
    result: PromiseSettledResult<R>,
    apply: (before: T | null, after: R, interrupted: boolean) => Update<T>,
  ): Promise<void> {
    await this.store.state(key, initialHealth<T>(), async (state, manager) => {
      const queue = async (messages: EmbedBuilder[]) => {
        state.version++;
        await this.store.queue(manager, {
          ...target,
          eventKey: `${key}:${state.version}`,
          embeds: messages.map((e) => e.toJSON()),
        });
      };
      if (result.status === 'rejected') {
        state.failures++;
        if (state.failures >= 3 && !state.unavailable) {
          state.unavailable = true;
          await queue(
            this.embeds.message(
              `Przerwa monitoringu ${this.sourceLabel(key, target)}: 3 kolejne odczyty nie powiodły się. Ostatni poprawny stan pozostaje zapisany. To nie oznacza awarii gry.`,
              'warning',
            ),
          );
        }
        this.logger.warn(`Source read failed: ${key}`);
        return;
      }
      const interrupted = state.failures > 0;
      if (state.unavailable)
        await queue(
          this.embeds.message(
            `Monitoring ${this.sourceLabel(key, target)} wznowiony. Ponownie otrzymujemy dane ze źródła.`,
            'success',
          ),
        );
      const update = apply(state.snapshot, result.value, interrupted);
      state.failures = 0;
      state.unavailable = false;
      state.snapshot = update.snapshot;
      for (const message of update.messages) await queue(message);
    });
  }

  @Cron('* * * * *', {
    name: CronjobName.WOW_NOTIFICATIONS_DISPATCH,
    waitForCompletion: true,
  })
  async dispatch(): Promise<void> {
    if (!this.client.isReady()) return;
    await this.safely('notifications', async () =>
      this.store.lock('wow:dispatch', async () => {
        const repository = this.dataSource.getRepository(WowNotification);
        const notifications = await repository
          .createQueryBuilder('n')
          .where('n.sentAt IS NULL AND n.nextAttemptAt <= now()')
          .andWhere(
            `NOT EXISTS (SELECT 1 FROM wow_notifications older WHERE older.channel_id = n.channel_id AND older.sent_at IS NULL AND (older.created_at, older.id) < (n.created_at, n.id))`,
          )
          .orderBy('n.createdAt', 'ASC')
          .addOrderBy('n.id', 'ASC')
          .take(100)
          .getMany();
        const watches = await this.activeWatches();
        const observers = await this.activeObservers();
        for (const n of notifications) {
          const active =
            n.kind === 'status'
              ? watches.some(
                  (w) => w.guildId === n.guildId && w.channelId === n.channelId,
                )
              : observers.some(
                  (o) =>
                    o.guildId === n.guildId &&
                    o.channelId === n.channelId &&
                    o.characterSlug === n.characterSlug,
                );
          if (!active) {
            await repository.delete(n.id);
            continue;
          }
          try {
            const channel = await this.client.channels.fetch(n.channelId);
            if (
              !channel ||
              !channel.isTextBased() ||
              !('guildId' in channel) ||
              channel.guildId !== n.guildId ||
              !channel.isSendable()
            )
              throw new Error('Notification channel unavailable');
            await channel.send({
              embeds: n.embeds,
              allowedMentions: { parse: [] },
              nonce: n.id.replace(/-/g, '').slice(0, 25),
              enforceNonce: true,
            });
            await repository.update(n.id, { sentAt: new Date() });
          } catch {
            await repository.update(n.id, {
              attempts: n.attempts + 1,
              nextAttemptAt: new Date(
                Date.now() +
                  Math.min(30, 2 ** Math.min(n.attempts, 5)) * 60_000,
              ),
            });
            this.logger.warn(
              `Notification delivery failed: ${n.id}; queued for retry`,
            );
          }
        }
        await repository.delete({
          sentAt: LessThan(new Date(Date.now() - 7 * 86400_000)),
        });
      }),
    );
  }

  private sourceLabel(key: string, target: Target): string {
    return key.startsWith('forum:')
      ? 'zgłoszeń graczy na forum EU'
      : target.kind === 'character'
        ? `postaci ${target.characterSlug}`
        : 'statusu realmów EU';
  }

  private async safely(
    label: string,
    action: () => Promise<void>,
  ): Promise<void> {
    try {
      await action();
    } catch (error) {
      this.logger.error(
        `WoW ${label} failed`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
