import { Injectable, Logger } from '@nestjs/common';
import {
  Client,
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
      if (error instanceof WowSourceError)
        return this.embeds.message(error.message, 'error');
      this.logger.error(
        'WoW command failed',
        error instanceof Error ? error.stack : String(error),
      );
      return this.embeds.message(
        'Nie udało się wykonać polecenia. Spróbuj ponownie później.',
        'error',
      );
    }
  }

  async character(input: string): Promise<EmbedBuilder[]> {
    return this.embeds.character(await this.source.character(input));
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
            'Brak aktualnych danych oficjalnego statusu EU. Nie oznacza to, że realmy są offline.',
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
          'Brak aktualnych danych zgłoszeń graczy na forum EU.',
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
        'Ten kanał nie jest dozwolony dla obserwacji postaci. Administrator bota może włączyć go przez /wow config character-channel.',
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
          throw new WowSourceError('Kanał nie jest już dozwolony.');
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
        `Obserwacja **${character.name}** zapisana dla <#${channelId}>. Powiadomienia: poziom, gildia i specjalizacja.`,
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
        : 'Brak obserwacji postaci na tym serwerze.',
    );
  }

  async remove(
    guildId: string,
    userId: string,
    id: string,
  ): Promise<EmbedBuilder[]> {
    if (!/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(id))
      throw new WowSourceError('Podaj ID obserwacji z /wow observer list.');
    const admin = await this.isAdmin(userId);
    const repository = this.dataSource.getRepository(WowObserver);
    const observation = await repository.findOneBy(
      admin ? { id, guildId } : { id, guildId, userId },
    );
    if (!observation)
      throw new WowSourceError(
        'Nie znaleziono obserwacji, którą możesz usunąć na tym serwerze.',
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
    return this.embeds.message('Obserwacja usunięta.', 'success');
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
      `Obserwacje postaci na <#${channelId}>: **${enabled ? 'dozwolone' : 'wyłączone'}**.`,
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
        `Status EU jest już monitorowany na <#${channelId}>.`,
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
        `Status wszystkich realmów EU i sygnały problemów z logowaniem będą sprawdzane co 5 minut. Kanał: <#${channelId}>. Stan początkowy nie jest ogłaszany na kanale.`,
        'success',
      ),
      ...(realms.status === 'fulfilled'
        ? this.embeds.realms(realms.value)
        : this.embeds.message(
            'Kanał zapisany; źródło statusu jest teraz niedostępne. Pierwszy poprawny odczyt ustali stan początkowy.',
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
      'Automatyczny monitoring statusu i zgłoszeń logowania wyłączony na tym serwerze.',
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
      throw new WowSourceError('Konfiguracja wymaga roli administratora bota.');
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
        'Wybierz kanał tekstowy na bieżącym serwerze Discorda.',
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
        'Bot potrzebuje na tym kanale uprawnień View Channel, Send Messages i Embed Links.',
      );
    if (viewerId) {
      const member = await channel.guild.members.fetch(viewerId);
      if (!channel.permissionsFor(member)?.has(PermissionFlagsBits.ViewChannel))
        throw new WowSourceError('Nie masz dostępu do wybranego kanału.');
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
        'Najpierw zainicjalizuj serwer przez /guild initialize.',
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
