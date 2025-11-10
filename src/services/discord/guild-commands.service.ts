import {
  CHANNEL_FEATURE_DEFAULTS,
  GUILD_SETTING_DEFAULTS,
} from '@Constants/discord-guild-config.constant';
import { GUILD_COMMANDS_CONFIG } from '@Constants/discord/guild-commands.constant';
import { ERROR_CODE_MESSAGE_MAP } from '@Constants/error-messages.constant';
import { DiscordGuildDto } from '@DTOs/discord-guild.dto';
import { DiscordSettingKey } from '@Enums/discord/discord-setting-key.enum';
import { ErrorCode } from '@Enums/error-code.enum';
import { Injectable, Logger } from '@nestjs/common';
import { DiscordGuildService } from '@Services/discord-guild.service';
import { DiscordSettingsService } from '@Services/discord-settings.service';
import { EmbedVariant } from '@Types/discord/embed-variant.type';
import { EmbedBuilder } from 'discord.js';
import { GuildEmbedBuilderService } from './guild/guild-embed-builder.service';

@Injectable()
export class GuildCommandsService {
  private readonly logger = new Logger(this.constructor.name);

  constructor(
    private readonly embedBuilderService: GuildEmbedBuilderService,
    private readonly discordGuildService: DiscordGuildService,
    private readonly discordSettingsService: DiscordSettingsService,
  ) {}

  async initializeHandler({
    guildId,
    guildName,
  }: {
    guildId: string;
    guildName: string;
  }): Promise<EmbedBuilder> {
    const config = await this.discordGuildService.findById(guildId);

    if (!config.isErr()) {
      return this.generateSimpleEmbed({
        description: 'Guild is already initialized.',
        variant: 'error',
      });
    }

    const newConfig = await this.discordGuildService.create(
      new DiscordGuildDto({
        id: guildId,
        name: guildName,
        features: [],
        channelFeatureDefaults: CHANNEL_FEATURE_DEFAULTS,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );

    if (newConfig.isErr()) {
      return this.generateSimpleEmbed({
        description: ERROR_CODE_MESSAGE_MAP[newConfig.error],
        variant: 'error',
      });
    }

    let settingsPropagationError: ErrorCode | null = null;

    for (const [key, value] of Object.entries(GUILD_SETTING_DEFAULTS)) {
      const setting = await this.discordSettingsService.set({
        key: key as DiscordSettingKey,
        value: value,
        guildId: newConfig.value.id,
      });

      if (setting.isErr()) {
        settingsPropagationError = setting.error;
        break;
      }
    }

    if (settingsPropagationError) {
      return this.generateSimpleEmbed({
        description: ERROR_CODE_MESSAGE_MAP[settingsPropagationError],
        variant: 'error',
      });
    }

    return this.generateSimpleEmbed({
      description: 'Guild initialized.',
      variant: 'success',
    });
  }

  async listHandler(): Promise<EmbedBuilder> {
    const guildConfigs = await this.discordGuildService.findAll();

    return this.embedBuilderService.guildConfigList({
      description: 'Guild configs list.',
      guildConfigs,
    });
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
      title: GUILD_COMMANDS_CONFIG.embed.title,
      thumbnail: GUILD_COMMANDS_CONFIG.embed.thumbnail,
      logger: this.logger,
    });
  }
}
