import { Injectable, Logger } from '@nestjs/common';
import {
  Client,
  DiscordAPIError,
  EmbedBuilder,
  GuildTextBasedChannel,
  PermissionFlagsBits,
} from 'discord.js';
import { DataSource } from 'typeorm';
import { DiscordChannel } from '@Database/entities/discord-channel.entity';
import { DiscordGuild } from '@Database/entities/discord-guild.entity';
import { DiscordUser } from '@Database/entities/discord-user.entity';
import { WowObserver } from '@Database/entities/wow-observer.entity';
import { WowStatusWatch } from '@Database/entities/wow-status-watch.entity';
import { WowMonitorState } from '@Database/entities/wow-monitor-state.entity';
import { WowNotification } from '@Database/entities/wow-notification.entity';
import { DiscordChannelFeature } from '@Enums/discord/discord-channel-feature.enum';
import { DiscordUserRole } from '@Enums/discord/discord-user-role.enum';
import {
  WowCharacter,
  WowForumState,
  WowHealthState,
  WowRealm,
  WowSourceError,
} from '@Types/wow/wow.type';
import { WowSourceService } from '@Services/wow/wow-source.service';
import { wowErrorDetails } from '@Services/wow/wow-error-details';
import { WowForumService } from '@Services/wow/wow-forum.service';
import { WowEmbedService } from '@Services/wow/wow-embed.service';
import {
  initialHealth,
  WowStoreService,
} from '@Services/wow/wow-store.service';
import {
  characterStateKey,
  forumStateKey,
  initialForum,
  realmStateKey,
} from '@Services/wow/wow-monitor.service';
import { forumSignals } from '@Services/wow/wow-signals';

@Injectable()
export class WowCommandsService {
  private readonly logger = new Logger(WowCommandsService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly source: WowSourceService,
    private readonly forum: WowForumService,
    private readonly store: WowStoreService,
    private readonly embeds: WowEmbedService,
    private readonly client: Client,
  ) {}

  async execute(
    action: () => Promise<EmbedBuilder[]>,
  ): Promise<EmbedBuilder[]> {
    try {
      return await action();
    } catch (error) {
      if (error instanceof WowSourceError) {
        this.logger.warn(`WoW command failed: ${wowErrorDetails(error)}`);
        return this.embeds.message(error.message, 'error');
      }
      this.logger.error(
        'WoW command failed',
        error instanceof Error ? error.stack : String(error),
      );
      return this.embeds.message(
        'Could not run the command. Please try again later.',
        'error',
      );
    }
  }

  async character(input: string): Promise<EmbedBuilder[]> {
    return this.embeds.character(await this.source.character(input));
  }

  async allowedObservationChannels(
    guildId: string,
    userId: string,
  ): Promise<{ value: string; label: string }[]> {
    const channels = await this.dataSource
      .getRepository(DiscordChannel)
      .findBy({ discordGuildId: guildId });
    const options: { value: string; label: string }[] = [];
    for (const row of channels) {
      if (row.features[DiscordChannelFeature.WOW_FOREVER] !== true) continue;
      try {
        const channel = await this.channel(guildId, row.id, userId);
        options.push({ value: row.id, label: `#${channel.name}` });
      } catch (error) {
        if (
          error instanceof WowSourceError ||
          (error instanceof DiscordAPIError &&
            [10003, 10007, 50001, 50013].includes(Number(error.code)))
        )
          continue;
        throw error;
      }
    }
    return options.sort((a, b) => a.label.localeCompare(b.label));
  }

  async observedCharacters(
    guildId: string,
    channelId: string,
  ): Promise<{ value: string; label: string }[]> {
    const observations = await this.dataSource
      .getRepository(WowObserver)
      .createQueryBuilder('o')
      .select('o.characterSlug', 'slug')
      .distinct()
      .where('o.guildId = :guildId AND o.channelId = :channelId', {
        guildId,
        channelId,
      })
      .orderBy('o.characterSlug', 'ASC')
      .getRawMany<{ slug: string }>();
    if (!observations.length) return [];
    const states = await this.dataSource.getRepository(WowMonitorState).findBy(
      observations.map((o) => ({
        key: characterStateKey(guildId, channelId, o.slug),
      })),
    );
    const names = new Map(
      states.map((s) => [
        s.key,
        (s.data as WowHealthState<WowCharacter>).snapshot?.name,
      ]),
    );
    return observations.map(({ slug }) => ({
      value: slug,
      label:
        names.get(characterStateKey(guildId, channelId, slug)) ??
        slug
          .split('-')
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' '),
    }));
  }

  async observedCharacter(
    guildId: string,
    channelId: string,
    slug: string,
  ): Promise<EmbedBuilder[]> {
    if (
      !(await this.dataSource
        .getRepository(WowObserver)
        .existsBy({ guildId, channelId, characterSlug: slug }))
    ) {
      throw new WowSourceError(
        'This character is no longer observed in this channel. Run /wow character again.',
      );
    }
    return this.character(slug);
  }

  async status(guildId: string): Promise<EmbedBuilder[]> {
    const watch = await this.dataSource
      .getRepository(WowStatusWatch)
      .findOneBy({ guildId });
    const stored = watch
      ? await this.dataSource
          .getRepository(WowMonitorState)
          .findOneBy({ key: forumStateKey(guildId, watch.channelId) })
      : null;
    const health = stored?.data as WowHealthState<WowForumState> | undefined;
    const [realms, forum] = await Promise.allSettled([
      this.source.realms(),
      this.forum.read(health?.snapshot?.topicIds ?? []),
    ]);
    const result =
      realms.status === 'fulfilled'
        ? this.embeds.realms(realms.value)
        : this.embeds.message(
            'Current official EU status data is unavailable. This does not mean the realms are offline.',
            'warning',
          );
    if (forum.status === 'fulfilled') {
      const baseline =
        health?.snapshot ??
        initialForum(new Date(Date.now() - 15 * 60_000).toISOString());
      const state = forumSignals(
        baseline,
        forum.value,
        !!health?.failures,
      ).state;
      result.push(
        ...this.embeds.forumSummary({
          ...initialHealth<WowForumState>(),
          snapshot: state,
        }),
      );
    } else
      result.push(
        ...this.embeds.message(
          'Current player report data from the EU forum is unavailable.',
          'warning',
        ),
      );
    return result;
  }

  async add(
    guildId: string,
    userId: string,
    channelId: string,
    input: string,
  ): Promise<EmbedBuilder[]> {
    await this.channel(guildId, channelId, userId);
    const allowed = await this.dataSource
      .getRepository(DiscordChannel)
      .findOneBy({ id: channelId, discordGuildId: guildId });
    if (!allowed?.features[DiscordChannelFeature.WOW_FOREVER])
      throw new WowSourceError(
        'This channel is not enabled for character observations. A bot administrator can enable it with /wow config character-channel.',
      );
    const character = await this.source.character(input);
    const key = characterStateKey(guildId, channelId, character.slug);
    await this.store.state(
      key,
      initialHealth<WowCharacter>(),
      async (state, manager) => {
        const channels = manager.getRepository(DiscordChannel);
        const current = await channels.findOneBy({
          id: channelId,
          discordGuildId: guildId,
        });
        if (!current?.features[DiscordChannelFeature.WOW_FOREVER])
          throw new WowSourceError(
            'This channel is no longer enabled for character observations.',
          );
        const repository = manager.getRepository(WowObserver);
        const count = await repository.countBy({
          guildId,
          channelId,
          characterSlug: character.slug,
        });
        if (!count) {
          // A newly created channel subscription starts at the current profile;
          // it must not inherit a backlog from a previously removed subscription.
          Object.assign(state, initialHealth<WowCharacter>(), {
            snapshot: character,
          });
          await manager
            .getRepository(WowNotification)
            .delete({ guildId, channelId, characterSlug: character.slug });
        }
        await repository
          .createQueryBuilder()
          .insert()
          .values({ guildId, channelId, userId, characterSlug: character.slug })
          .orIgnore()
          .execute();
      },
    );
    return [
      ...this.embeds.message(
        `Observation saved for **${character.name}** in <#${channelId}>. Alerts: level, guild and specialization changes.`,
        'success',
      ),
      ...this.embeds.character(character),
    ];
  }

  async list(guildId: string, userId: string): Promise<EmbedBuilder[]> {
    const admin = await this.isAdmin(userId);
    const rows = await this.dataSource.getRepository(WowObserver).find({
      where: admin ? { guildId } : { guildId, userId },
      order: { createdAt: 'DESC' },
    });
    return this.embeds.message(
      rows.length
        ? rows
            .map(
              (o) =>
                `**${o.characterSlug}** · <#${o.channelId}>${admin ? ` · <@${o.userId}>` : ''}\nID: \`${o.id}\``,
            )
            .join('\n\n')
        : 'No character observations to display on this server.',
    );
  }

  async remove(
    guildId: string,
    userId: string,
    id: string,
  ): Promise<EmbedBuilder[]> {
    if (!/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(id))
      throw new WowSourceError(
        'Enter an observation ID from /wow observer list.',
      );
    const admin = await this.isAdmin(userId);
    const repository = this.dataSource.getRepository(WowObserver);
    const observation = await repository.findOneBy(
      admin ? { id, guildId } : { id, guildId, userId },
    );
    if (!observation)
      throw new WowSourceError(
        'Observation not found, or you do not have permission to remove it on this server.',
      );
    await this.store.state(
      characterStateKey(
        guildId,
        observation.channelId,
        observation.characterSlug,
      ),
      initialHealth<WowCharacter>(),
      async (_state, manager) => {
        await manager
          .getRepository(WowObserver)
          .delete(admin ? { id, guildId } : { id, guildId, userId });
        const remaining = await manager.getRepository(WowObserver).countBy({
          guildId,
          channelId: observation.channelId,
          characterSlug: observation.characterSlug,
        });
        if (!remaining)
          await manager.getRepository(WowNotification).delete({
            guildId,
            channelId: observation.channelId,
            characterSlug: observation.characterSlug,
          });
      },
    );
    return this.embeds.message('Observation removed.', 'success');
  }

  async allowChannel(
    guildId: string,
    userId: string,
    channelId: string,
    enabled: boolean,
  ): Promise<EmbedBuilder[]> {
    await this.requireAdmin(userId);
    const channel = await this.channel(guildId, channelId);
    await this.registerChannel(guildId, channel);
    const repository = this.dataSource.getRepository(DiscordChannel);
    await repository
      .createQueryBuilder()
      .update()
      .set({
        features: () =>
          `jsonb_set(features::jsonb, '{wow_forever}', :enabled::jsonb)::json`,
      })
      .where('id = :id AND discord_guild_id = :guild', {
        id: channelId,
        guild: guildId,
        enabled: JSON.stringify(enabled),
      })
      .execute();
    return this.embeds.message(
      `Character observations in <#${channelId}>: **${enabled ? 'enabled' : 'disabled'}**.`,
      'success',
    );
  }

  async setStatusChannel(
    guildId: string,
    userId: string,
    channelId: string,
  ): Promise<EmbedBuilder[]> {
    await this.requireAdmin(userId);
    const channel = await this.channel(guildId, channelId);
    await this.registerChannel(guildId, channel);
    const repository = this.dataSource.getRepository(WowStatusWatch);
    const existing = await repository.findOneBy({ guildId });
    if (existing?.channelId === channelId)
      return this.embeds.message(
        `EU status is already monitored in <#${channelId}>.`,
        'info',
      );
    const [realms] = await Promise.allSettled([this.source.realms()]);
    const startedAt = new Date().toISOString();
    await this.dataSource.transaction(async (manager) => {
      await manager.query(
        'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
        [`wow:config:${guildId}`],
      );
      await manager.getRepository(WowStatusWatch).save({ guildId, channelId });
      await manager
        .getRepository(WowNotification)
        .delete({ guildId, kind: 'status' });
      const states = manager.getRepository(WowMonitorState);
      const realmHealth = initialHealth<WowRealm[]>();
      if (realms.status === 'fulfilled') realmHealth.snapshot = realms.value;
      await states.save([
        { key: realmStateKey(guildId, channelId), data: realmHealth },
        {
          key: forumStateKey(guildId, channelId),
          data: {
            ...initialHealth<WowForumState>(),
            snapshot: initialForum(startedAt),
          },
        },
      ]);
    });
    return [
      ...this.embeds.message(
        `EU realm status and login reports will be checked every 5 minutes. Channel: <#${channelId}>. The initial state will not be posted to the channel.`,
        'success',
      ),
      ...(realms.status === 'fulfilled'
        ? this.embeds.realms(realms.value)
        : this.embeds.message(
            'Channel saved. The status source is currently unavailable. The first successful check will establish the initial state.',
            'warning',
          )),
    ];
  }

  async disableStatus(
    guildId: string,
    userId: string,
  ): Promise<EmbedBuilder[]> {
    await this.requireAdmin(userId);
    await this.dataSource.transaction(async (manager) => {
      await manager.query(
        'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
        [`wow:config:${guildId}`],
      );
      await manager.getRepository(WowStatusWatch).delete({ guildId });
      await manager
        .getRepository(WowNotification)
        .delete({ guildId, kind: 'status' });
    });
    return this.embeds.message(
      'Automatic realm status and login report monitoring is disabled on this server.',
      'success',
    );
  }

  private async isAdmin(userId: string): Promise<boolean> {
    const user = await this.dataSource
      .getRepository(DiscordUser)
      .findOneBy({ id: userId });
    return !!user?.roles.some((r) =>
      [DiscordUserRole.ADMIN, DiscordUserRole.SUPER_ADMIN].includes(r),
    );
  }

  private async requireAdmin(userId: string): Promise<void> {
    if (!(await this.isAdmin(userId)))
      throw new WowSourceError(
        'Configuration requires a bot administrator role.',
      );
  }

  private async channel(
    guildId: string,
    channelId: string,
    viewerId?: string,
  ): Promise<GuildTextBasedChannel> {
    const channel = await this.client.channels.fetch(channelId);
    if (
      !channel ||
      !('guildId' in channel) ||
      channel.guildId !== guildId ||
      !channel.isTextBased() ||
      channel.isThread() ||
      !channel.isSendable()
    )
      throw new WowSourceError(
        'Select a text channel in the current Discord server.',
      );
    const me = await channel.guild.members.fetchMe();
    if (
      !channel
        .permissionsFor(me)
        ?.has([
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.EmbedLinks,
        ])
    )
      throw new WowSourceError(
        'The bot needs View Channel, Send Messages and Embed Links permissions in this channel.',
      );
    if (viewerId) {
      const member = await channel.guild.members.fetch(viewerId);
      if (!channel.permissionsFor(member)?.has(PermissionFlagsBits.ViewChannel))
        throw new WowSourceError(
          'You do not have access to the selected channel.',
        );
    }
    return channel;
  }

  private async registerChannel(
    guildId: string,
    channel: GuildTextBasedChannel,
  ): Promise<void> {
    if (
      !(await this.dataSource
        .getRepository(DiscordGuild)
        .existsBy({ id: guildId }))
    )
      throw new WowSourceError(
        'Initialize this server first with /guild initialize.',
      );
    // New WoW channels must not opt into unrelated conversational features.
    const features = Object.fromEntries(
      Object.values(DiscordChannelFeature).map((f) => [f, false]),
    ) as Record<DiscordChannelFeature, boolean>;
    await this.dataSource
      .getRepository(DiscordChannel)
      .createQueryBuilder()
      .insert()
      .values({
        id: channel.id,
        name: channel.name,
        discordGuildId: guildId,
        features,
      })
      .orIgnore()
      .execute();
  }
}
