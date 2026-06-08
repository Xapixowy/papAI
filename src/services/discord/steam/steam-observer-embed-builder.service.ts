import { STEAM_COMMANDS_CONFIG } from '@Constants/discord/steam-commands.constant';
import { DiscordSteamObserver } from '@Database/entities/discord-steam-observer.entity';
import { SteamGame } from '@Database/entities/steam-game.entity';
import { SteamUser } from '@Database/entities/steam-user.entity';
import { DiscordButtonId } from '@Enums/discord/discord-button-id.enum';
import { DiscordSelectId } from '@Enums/discord/discord-select-id.enum';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SteamPendingObserver } from '@Types/steam/steam-api.type';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
  StringSelectMenuBuilder,
} from 'discord.js';
import { EmbedBuilderService } from '../embed-builder.service';

@Injectable()
export class SteamObserverEmbedBuilderService extends EmbedBuilderService {
  constructor(
    protected readonly client: Client,
    protected readonly configService: ConfigService,
  ) {
    super(client, configService);
  }

  steamUserConfirmation(pending: SteamPendingObserver): {
    embed: EmbedBuilder;
    button: ActionRowBuilder<ButtonBuilder>;
  } {
    const privacySection = this.generateSection({
      title: '`🔒` Privacy Status',
      description: [
        `Profile: ${pending.isProfilePublic ? '✅ Public' : '⚠️ Private'}`,
        `Games list: ${pending.isGamesPublic ? '✅ Public' : '⚠️ Private'}`,
      ],
    });

    const warningSection =
      !pending.isProfilePublic || !pending.isGamesPublic
        ? '\n\n> ⚠️ Notifications will only work when profile and games are set to public.'
        : '';

    const embed = this.simple({
      title: STEAM_COMMANDS_CONFIG.embed.title,
      thumbnail: STEAM_COMMANDS_CONFIG.embed.thumbnail,
      variant:
        !pending.isProfilePublic || !pending.isGamesPublic ? 'warning' : 'info',
      description:
        this.generateSection({
          title: '`👤` Steam User',
          description: [
            `Name: **${pending.username}**`,
            `SteamID64: \`${pending.steamId}\``,
            pending.profileUrl ? `Profile: ${pending.profileUrl}` : '',
          ].filter(Boolean),
        }) +
        '\n\n' +
        privacySection +
        warningSection,
    });

    if (pending.avatarUrl) {
      embed.setImage(pending.avatarUrl);
    }

    const button = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(DiscordButtonId.STEAM_OBSERVER_ADD_CONFIRM)
        .setLabel('Choose Notification Channel')
        .setEmoji('🔔')
        .setStyle(ButtonStyle.Primary),
    );

    return { embed, button };
  }

  channelSelect(channels: { id: string; name: string }[]): {
    embed: EmbedBuilder;
    component: ActionRowBuilder<StringSelectMenuBuilder>;
  } {
    const select = new StringSelectMenuBuilder()
      .setCustomId(DiscordSelectId.STEAM_OBSERVER_CHANNEL)
      .setPlaceholder('Select a channel for notifications')
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(
        channels.map((c) => ({
          label: `#${c.name}`,
          value: c.id,
          description: `Channel ID: ${c.id}`,
        })),
      );

    const component =
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

    const embed = this.simple({
      title: STEAM_COMMANDS_CONFIG.embed.title,
      thumbnail: STEAM_COMMANDS_CONFIG.embed.thumbnail,
      variant: 'info',
      description: 'Select a channel where game notifications will be sent.',
    });

    return { embed, component };
  }

  observerList({
    observers,
    steamUsers,
    channels,
    guilds,
    discordUsers,
  }: {
    observers: DiscordSteamObserver[];
    steamUsers: Map<string, SteamUser>;
    channels: Map<string, string>;
    guilds: Map<string, string>;
    discordUsers: Map<string, string>;
  }): EmbedBuilder {
    const byGuild = new Map<string, DiscordSteamObserver[]>();
    for (const o of observers) {
      const list = byGuild.get(o.discordGuildId) ?? [];
      list.push(o);
      byGuild.set(o.discordGuildId, list);
    }

    const rows: string[] = [];
    for (const [guildId, guildObservers] of byGuild) {
      const guildName = guilds.get(guildId) ?? guildId;
      rows.push(`- \`🏠 ${guildName} | ${guildId}\``);
      for (const o of guildObservers) {
        const su = steamUsers.get(o.steamUserId);
        const channelName =
          channels.get(o.discordChannelId) ?? o.discordChannelId;
        const suName = su?.username ?? o.steamUserId;
        const addedBy = discordUsers.get(o.discordUserId) ?? o.discordUserId;
        rows.push(
          `  - **${suName}** → \`#${channelName}\` *(set by ${addedBy})*`,
        );
      }
    }

    const section = this.generateSection({
      title: '`🎮` Steam Observers',
      description: rows.length ? rows : ['No observers configured.'],
    });

    return this.simple({
      title: STEAM_COMMANDS_CONFIG.embed.title,
      thumbnail: STEAM_COMMANDS_CONFIG.embed.thumbnail,
      variant: 'info',
      description: section,
    });
  }

  observerRemoveSelect({
    observers,
    steamUsers,
    channels,
    discordUsers,
  }: {
    observers: DiscordSteamObserver[];
    steamUsers: Map<string, SteamUser>;
    channels: Map<string, string>;
    discordUsers: Map<string, string>;
  }): {
    embed: EmbedBuilder;
    component: ActionRowBuilder<StringSelectMenuBuilder>;
  } {
    const capped = observers.slice(0, 25);

    const options = capped.map((o) => {
      const su = steamUsers.get(o.steamUserId);
      const channelName =
        channels.get(o.discordChannelId) ?? o.discordChannelId;
      const suName = su?.username ?? o.steamUserId;
      const addedBy = discordUsers.get(o.discordUserId) ?? o.discordUserId;
      return {
        label: `${suName} → #${channelName}`.slice(0, 100),
        value: o.id,
        description: `Set by ${addedBy}`.slice(0, 100),
      };
    });

    const select = new StringSelectMenuBuilder()
      .setCustomId(DiscordSelectId.STEAM_OBSERVER_REMOVE)
      .setPlaceholder('Select an observer to remove')
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(options);

    const component =
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

    const extraNote =
      observers.length > 25
        ? '\n\n> Only the first 25 observers are shown.'
        : '';

    const embed = this.simple({
      title: STEAM_COMMANDS_CONFIG.embed.title,
      thumbnail: STEAM_COMMANDS_CONFIG.embed.thumbnail,
      variant: 'info',
      description: `Select an observer to remove.${extraNote}`,
    });

    return { embed, component };
  }

  newGameNotification({
    steamUser,
    game,
  }: {
    steamUser: SteamUser | null;
    game: SteamGame;
  }): EmbedBuilder {
    const storeUrl = `https://store.steampowered.com/app/${game.id}`;
    const userName = steamUser?.username ?? 'Unknown';

    const platforms: string[] = [];
    if (game.platformWindows) platforms.push('Windows');
    if (game.platformMac) platforms.push('Mac');
    if (game.platformLinux) platforms.push('Linux');

    const profileUrl = steamUser?.profileUrl ?? null;
    const userLink = profileUrl
      ? `[${userName}](${profileUrl})`
      : `**${userName}**`;
    const gameLink = `[${game.name}](${storeUrl})`;

    const descriptionLines = game.description
      ? [
          game.description.length > 400
            ? `${game.description.slice(0, 397)}...`
            : game.description,
        ]
      : ['No description available.'];

    const description = this.generateSection({
      title: '`🎮` ' + `${userLink} added ${gameLink}`,
      description: descriptionLines,
    });

    const embed = new EmbedBuilder()
      .setColor('#1b2838')
      .setTitle(STEAM_COMMANDS_CONFIG.embed.title)
      .setDescription(description)
      .setTimestamp()
      .setFooter(this.generateFooter());

    if (steamUser?.avatarUrl) {
      embed.setThumbnail(steamUser.avatarUrl);
    } else if (game.imageUrl) {
      embed.setThumbnail(game.imageUrl);
    }

    const screenshot = game.screenshots.length
      ? game.screenshots[Math.floor(Math.random() * game.screenshots.length)]
      : game.imageUrl;
    if (screenshot) embed.setImage(screenshot);

    const fields: { name: string; value: string; inline: boolean }[] = [];

    fields.push({
      name: 'Price',
      value: game.price ?? 'Unknown',
      inline: true,
    });
    fields.push({
      name: 'Release date',
      value: game.releasedAt
        ? game.releasedAt.toLocaleDateString('en-GB')
        : '-',
      inline: true,
    });
    fields.push({
      name: 'Platforms',
      value: platforms.length ? platforms.join(', ') : '-',
      inline: true,
    });
    fields.push({
      name: 'Developers',
      value: game.developers.length ? game.developers.join(', ') : '-',
      inline: true,
    });
    fields.push({
      name: 'Publishers',
      value: game.publishers.length ? game.publishers.join(', ') : '-',
      inline: true,
    });
    fields.push({
      name: 'Achievements',
      value:
        game.achievementsCount != null ? String(game.achievementsCount) : '-',
      inline: true,
    });

    if (game.genres.length) {
      fields.push({
        name: 'Genres',
        value: game.genres.join(', '),
        inline: false,
      });
    }
    if (game.categories.length) {
      fields.push({
        name: 'Categories',
        value: game.categories.join(', ').slice(0, 1024),
        inline: false,
      });
    }
    if (game.metacriticScore != null) {
      const score = game.metacriticScore;
      const indication =
        score >= 90
          ? `🟢 Universal Acclaim (${score})`
          : score >= 75
            ? `🟢 Generally Favorable (${score})`
            : score >= 50
              ? `🟡 Mixed or Average (${score})`
              : score >= 20
                ? `🔴 Generally Unfavorable (${score})`
                : `🔴 Overwhelming Dislike (${score})`;
      const value = game.metacriticUrl
        ? `[${indication}](${game.metacriticUrl})`
        : indication;
      fields.push({ name: 'Metacritic', value, inline: false });
    }

    embed.addFields(fields);
    return embed;
  }
}
