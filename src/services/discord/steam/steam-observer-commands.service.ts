import { STEAM_COMMANDS_CONFIG } from '@Constants/discord/steam-commands.constant';
import { ERROR_CODE_MESSAGE_MAP } from '@Constants/error-messages.constant';
import { STEAM_CONFIG } from '@Constants/steam-config.constant';
import { DiscordSteamObserverDto } from '@DTOs/discord-steam-observer.dto';
import { SteamUserDto } from '@DTOs/steam-user.dto';
import { DiscordChannelFeature } from '@Enums/discord/discord-channel-feature.enum';
import { DiscordUserRole } from '@Enums/discord/discord-user-role.enum';
import { ErrorCode } from '@Enums/error-code.enum';
import { ProviderToken } from '@Enums/provider-token.enum';
import { Injectable, Inject, Logger } from '@nestjs/common';
import { SteamApiService } from '@Services/api/steam.service';
import { DiscordChannelService } from '@Services/discord-channel.service';
import { DiscordGuildService } from '@Services/discord-guild.service';
import { DiscordSteamObserversService } from '@Services/discord-steam-observers.service';
import { DiscordUsersService } from '@Services/discord-users.service';
import { SteamGamesService } from '@Services/steam-games.service';
import { SteamUserGamesService } from '@Services/steam-user-games.service';
import { SteamUsersService } from '@Services/steam-users.service';
import { SteamPendingObserver } from '@Types/steam/steam-api.type';
import { EmbedVariant } from '@Types/discord/embed-variant.type';
import {
  ActionRowBuilder,
  ButtonBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
} from 'discord.js';
import { Redis } from 'ioredis';
import { SteamObserverEmbedBuilderService } from './steam-observer-embed-builder.service';
import {
  EnrichResult,
  SteamObserverSchedulerService,
} from './steam-observer-scheduler.service';

@Injectable()
export class SteamObserverCommandsService {
  private readonly logger = new Logger(this.constructor.name);

  constructor(
    private readonly steamApiService: SteamApiService,
    private readonly steamUsersService: SteamUsersService,
    private readonly steamGamesService: SteamGamesService,
    private readonly steamUserGamesService: SteamUserGamesService,
    private readonly discordSteamObserversService: DiscordSteamObserversService,
    private readonly discordChannelService: DiscordChannelService,
    private readonly discordGuildService: DiscordGuildService,
    private readonly discordUsersService: DiscordUsersService,
    private readonly embedBuilderService: SteamObserverEmbedBuilderService,
    @Inject(ProviderToken.REDIS) private readonly redis: Redis,
    private readonly schedulerService: SteamObserverSchedulerService,
  ) {}

  async addHandler({
    steamInput,
    discordUserId,
    guildId,
  }: {
    steamInput: string;
    discordUserId: string;
    guildId: string;
  }): Promise<{
    embed: EmbedBuilder;
    button?: ActionRowBuilder<ButtonBuilder>;
  }> {
    let steamId = steamInput;

    if (this.steamApiService.isVanityUrl(steamInput)) {
      const resolved = await this.steamApiService.resolveVanityUrl(steamInput);
      if (resolved.isErr()) {
        return {
          embed: this.generateSimpleEmbed({
            description: 'Steam user not found. Check the ID or vanity URL.',
            variant: 'error',
          }),
        };
      }
      steamId = resolved.value;
    }

    const playerResult = await this.steamApiService.getPlayerSummary(steamId);
    if (playerResult.isErr()) {
      return {
        embed: this.generateSimpleEmbed({
          description:
            playerResult.error === ErrorCode.STEAM_USER_NOT_FOUND
              ? 'Steam user not found.'
              : 'Steam API error. Try again later.',
          variant: 'error',
        }),
      };
    }

    const player = playerResult.value;
    const isProfilePublic = player.communityvisibilitystate === 3;

    const gamesResult = await this.steamApiService.getOwnedGames(steamId);
    const isGamesPublic = gamesResult.isOk() && gamesResult.value.length > 0;

    const pending: SteamPendingObserver = {
      steamId,
      username: player.personaname,
      avatarUrl: player.avatarfull || null,
      profileUrl: player.profileurl || null,
      isProfilePublic,
      isGamesPublic,
    };

    await this.redis.set(
      this.pendingKey(discordUserId, guildId),
      JSON.stringify(pending),
      'EX',
      STEAM_CONFIG.pendingObserverTtl,
    );

    const { embed, button } =
      this.embedBuilderService.steamUserConfirmation(pending);
    return { embed, button };
  }

  async addButtonHandler({
    discordUserId,
    guildId,
  }: {
    discordUserId: string;
    guildId: string;
  }): Promise<{
    embed: EmbedBuilder;
    component?: ActionRowBuilder<StringSelectMenuBuilder>;
  }> {
    const pendingRaw = await this.redis.get(
      this.pendingKey(discordUserId, guildId),
    );

    if (!pendingRaw) {
      return {
        embed: this.generateSimpleEmbed({
          description:
            ERROR_CODE_MESSAGE_MAP[ErrorCode.STEAM_OBSERVER_PENDING_NOT_FOUND],
          variant: 'error',
        }),
      };
    }

    const allChannels =
      await this.discordChannelService.findAllByGuildId(guildId);

    if (allChannels.isErr()) {
      return {
        embed: this.generateSimpleEmbed({
          description:
            ERROR_CODE_MESSAGE_MAP[ErrorCode.STEAM_NO_CHANNELS_WITH_FEATURE],
          variant: 'error',
        }),
      };
    }

    const steamChannels = allChannels.value.filter(
      (c) => c.features[DiscordChannelFeature.STEAM] === true,
    );

    if (!steamChannels.length) {
      return {
        embed: this.generateSimpleEmbed({
          description:
            ERROR_CODE_MESSAGE_MAP[ErrorCode.STEAM_NO_CHANNELS_WITH_FEATURE],
          variant: 'error',
        }),
      };
    }

    const { embed, component } = this.embedBuilderService.channelSelect(
      steamChannels.map((c) => ({ id: c.id, name: c.name })),
    );

    return { embed, component };
  }

  async addSelectHandler({
    discordUserId,
    guildId,
    channelId,
  }: {
    discordUserId: string;
    guildId: string;
    channelId: string;
  }): Promise<EmbedBuilder> {
    const key = this.pendingKey(discordUserId, guildId);
    const pendingRaw = await this.redis.get(key);

    if (!pendingRaw) {
      return this.generateSimpleEmbed({
        description:
          ERROR_CODE_MESSAGE_MAP[ErrorCode.STEAM_OBSERVER_PENDING_NOT_FOUND],
        variant: 'error',
      });
    }

    await this.redis.del(key);

    const pending = JSON.parse(pendingRaw) as SteamPendingObserver;

    await this.steamUsersService.upsert(
      new SteamUserDto({
        id: pending.steamId,
        username: pending.username,
        avatarUrl: pending.avatarUrl,
        profileUrl: pending.profileUrl,
      }),
    );

    const gamesResult = await this.steamApiService.getOwnedGames(
      pending.steamId,
    );
    if (gamesResult.isOk() && gamesResult.value.length > 0) {
      const ownedGames = gamesResult.value;
      await this.steamGamesService.upsertMany(ownedGames);
      await this.steamUserGamesService.createMany(
        pending.steamId,
        ownedGames.map((g) => g.appid),
      );
    }

    const created = await this.discordSteamObserversService.create(
      new DiscordSteamObserverDto({
        discordUserId,
        discordGuildId: guildId,
        discordChannelId: channelId,
        steamUserId: pending.steamId,
      }),
    );

    if (created.isErr()) {
      return this.generateSimpleEmbed({
        description: ERROR_CODE_MESSAGE_MAP[created.error],
        variant: 'error',
      });
    }

    return this.generateSimpleEmbed({
      description: `Observer for **${pending.username}** added. Notifications will be sent to <#${channelId}>.`,
      variant: 'success',
    });
  }

  async listHandler({
    discordUserId,
    guildId,
  }: {
    discordUserId: string;
    guildId: string;
  }): Promise<EmbedBuilder> {
    const role = await this.resolveUserRole(discordUserId);
    const observers = await this.fetchObserversForRole({
      role,
      discordUserId,
      guildId,
    });

    if (!observers.length) {
      return this.generateSimpleEmbed({
        description: 'No observers found.',
        variant: 'info',
      });
    }

    const { steamUsers, channels, guilds, discordUsers } =
      await this.buildObserverMaps(observers);

    return this.embedBuilderService.observerList({
      observers,
      steamUsers,
      channels,
      guilds,
      discordUsers,
    });
  }

  async removeHandler({
    discordUserId,
    guildId,
  }: {
    discordUserId: string;
    guildId: string;
  }): Promise<{
    embed: EmbedBuilder;
    component?: ActionRowBuilder<StringSelectMenuBuilder>;
  }> {
    const role = await this.resolveUserRole(discordUserId);
    const observers = await this.fetchObserversForRole({
      role,
      discordUserId,
      guildId,
    });

    if (!observers.length) {
      return {
        embed: this.generateSimpleEmbed({
          description: 'No observers to remove.',
          variant: 'info',
        }),
      };
    }

    const { steamUsers, channels, discordUsers } =
      await this.buildObserverMaps(observers);

    const { embed, component } = this.embedBuilderService.observerRemoveSelect({
      observers,
      steamUsers,
      channels,
      discordUsers,
    });

    return { embed, component };
  }

  async removeSelectHandler({
    observerId,
    discordUserId,
    guildId,
  }: {
    observerId: string;
    discordUserId: string;
    guildId: string;
  }): Promise<EmbedBuilder> {
    const observer =
      await this.discordSteamObserversService.findById(observerId);

    if (observer.isErr()) {
      return this.generateSimpleEmbed({
        description: ERROR_CODE_MESSAGE_MAP[observer.error],
        variant: 'error',
      });
    }

    const role = await this.resolveUserRole(discordUserId);

    if (
      !this.canManageObserver({
        role,
        discordUserId,
        guildId,
        observer: observer.value,
      })
    ) {
      return this.generateSimpleEmbed({
        description: 'You do not have permission to remove this observer.',
        variant: 'error',
      });
    }

    const deleted =
      await this.discordSteamObserversService.deleteById(observerId);

    if (deleted.isErr()) {
      return this.generateSimpleEmbed({
        description: ERROR_CODE_MESSAGE_MAP[deleted.error],
        variant: 'error',
      });
    }

    return this.generateSimpleEmbed({
      description: 'Observer removed.',
      variant: 'success',
    });
  }

  private async resolveUserRole(
    discordUserId: string,
  ): Promise<DiscordUserRole | null> {
    const user = await this.discordUsersService.findByUserId(discordUserId);
    if (user.isErr()) return null;

    if (user.value.roles.includes(DiscordUserRole.SUPER_ADMIN)) {
      return DiscordUserRole.SUPER_ADMIN;
    }
    if (user.value.roles.includes(DiscordUserRole.ADMIN)) {
      return DiscordUserRole.ADMIN;
    }
    return null;
  }

  private async fetchObserversForRole({
    role,
    discordUserId,
    guildId,
  }: {
    role: DiscordUserRole | null;
    discordUserId: string;
    guildId: string;
  }) {
    if (role === DiscordUserRole.SUPER_ADMIN) {
      return this.discordSteamObserversService.findAll();
    }
    if (role === DiscordUserRole.ADMIN) {
      return this.discordSteamObserversService.findByGuildId(guildId);
    }
    return this.discordSteamObserversService.findByDiscordUserId(discordUserId);
  }

  private canManageObserver({
    role,
    discordUserId,
    guildId,
    observer,
  }: {
    role: DiscordUserRole | null;
    discordUserId: string;
    guildId: string;
    observer: { discordUserId: string; discordGuildId: string };
  }): boolean {
    if (role === DiscordUserRole.SUPER_ADMIN) return true;
    if (role === DiscordUserRole.ADMIN) {
      return observer.discordGuildId === guildId;
    }
    return observer.discordUserId === discordUserId;
  }

  private async buildObserverMaps(
    observers: {
      steamUserId: string;
      discordChannelId: string;
      discordGuildId: string;
      discordUserId: string;
    }[],
  ) {
    const steamUserIds = [...new Set(observers.map((o) => o.steamUserId))];
    const channelIds = [...new Set(observers.map((o) => o.discordChannelId))];
    const discordUserIds = [...new Set(observers.map((o) => o.discordUserId))];

    const steamUserEntities =
      await this.steamUsersService.findByIds(steamUserIds);
    const steamUsers = new Map(steamUserEntities.map((u) => [u.id, u]));

    const channelResults = await Promise.all(
      channelIds.map((id) => this.discordChannelService.findById(id)),
    );
    const channels = new Map<string, string>();
    channelResults.forEach((r) => {
      if (r.isOk()) channels.set(r.value.id, r.value.name);
    });

    const allGuilds = await this.discordGuildService.findAll();
    const guilds = new Map(allGuilds.map((g) => [g.id, g.name]));

    const discordUserEntities =
      await this.discordUsersService.findByUserIds(discordUserIds);
    const discordUsers = new Map(
      discordUserEntities.map((u) => [u.id, u.username]),
    );

    return { steamUsers, channels, guilds, discordUsers };
  }

  async updateHandler({
    discordUserId,
    guildId,
    enrich,
  }: {
    discordUserId: string;
    guildId: string;
    enrich: boolean;
  }): Promise<EmbedBuilder> {
    const role = await this.resolveUserRole(discordUserId);
    const observers = await this.fetchObserversForRole({
      role,
      discordUserId,
      guildId,
    });

    if (!observers.length) {
      return this.generateSimpleEmbed({
        description: 'No observers to update.',
        variant: 'info',
      });
    }

    const uniqueSteamUserIds = [
      ...new Set(observers.map((o) => o.steamUserId)),
    ];
    const newGamesFound = await this.schedulerService.runForSteamUserIds(
      uniqueSteamUserIds,
      observers,
    );

    let enrichResult: EnrichResult | null = null;
    if (enrich) {
      enrichResult =
        await this.schedulerService.enrichAllForSteamUserIds(
          uniqueSteamUserIds,
        );
    }

    const updateSection = this.embedBuilderService.generateSection({
      title: '`🔄` Update',
      description: [
        `- Checked: **${uniqueSteamUserIds.length}** user(s)`,
        `- New games found: **${newGamesFound}**`,
      ],
    });

    const enrichSection = enrichResult
      ? this.embedBuilderService.generateSection({
          title: '`🔍` Enrichment',
          description: [
            `- Enriched: **${enrichResult.enriched}**`,
            `- Already enriched (skipped): **${enrichResult.skipped}**`,
            `- Not found in store (DLC/removed): **${enrichResult.notFound}**`,
            `- Failed (API error): **${enrichResult.failed}**`,
          ],
        })
      : null;

    const description = [updateSection, enrichSection]
      .filter(Boolean)
      .join('\n\n');

    return this.generateSimpleEmbed({
      description,
      variant: 'success',
    });
  }

  private pendingKey(discordUserId: string, guildId: string): string {
    return `steam:observer:pending:${discordUserId}:${guildId}`;
  }

  private generateSimpleEmbed({
    description,
    variant,
  }: {
    description: string;
    variant: EmbedVariant;
  }): EmbedBuilder {
    return this.embedBuilderService.simple({
      description,
      variant,
      title: STEAM_COMMANDS_CONFIG.embed.title,
      thumbnail: STEAM_COMMANDS_CONFIG.embed.thumbnail,
      logger: this.logger,
    });
  }
}
