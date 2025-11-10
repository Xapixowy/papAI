import { GUILD_COMMANDS_CONFIG } from '@Constants/discord/guild-commands.constant';
import { ERROR_CODE_MESSAGE_MAP } from '@Constants/error-messages.constant';
import { DiscordGuildDto } from '@DTOs/discord-guild.dto';
import { DiscordFeature } from '@Enums/discord/discord-feature.enum';
import { Injectable, Logger } from '@nestjs/common';
import { DiscordGuildService } from '@Services/discord-guild.service';
import { EmbedVariant } from '@Types/discord/embed-variant.type';
import { EmbedBuilder } from 'discord.js';
import { EmbedBuilderService } from '../embed-builder.service';

@Injectable()
export class FeatureCommandsService {
  private readonly logger = new Logger(this.constructor.name);

  constructor(
    private readonly embedBuilderService: EmbedBuilderService,
    private readonly discordGuildService: DiscordGuildService,
  ) {}

  async addFeatureHandler({
    guildId,
    feature,
  }: {
    guildId: string;
    feature: DiscordFeature;
  }): Promise<EmbedBuilder> {
    const config = await this.discordGuildService.findById(guildId);

    if (config.isErr()) {
      return this.generateSimpleEmbed({
        description: ERROR_CODE_MESSAGE_MAP[config.error],
        variant: 'error',
      });
    }

    const configValue = config.value;

    if (configValue.features.includes(feature)) {
      return this.generateSimpleEmbed({
        description: `Feature already enabled.`,
        variant: 'info',
      });
    }

    const updatedConfigDto: DiscordGuildDto = {
      ...configValue,
      features: [...configValue.features, feature],
    };

    const updateConfig =
      await this.discordGuildService.update(updatedConfigDto);

    if (updateConfig.isErr()) {
      return this.generateSimpleEmbed({
        description: ERROR_CODE_MESSAGE_MAP[updateConfig.error],
        variant: 'error',
      });
    }

    return this.generateSimpleEmbed({
      description: `Feature added.`,
      variant: 'success',
    });
  }

  async removeFeatureHandler({
    guildId,
    feature,
  }: {
    guildId: string;
    feature: DiscordFeature;
  }): Promise<EmbedBuilder> {
    const config = await this.discordGuildService.findById(guildId);

    if (config.isErr()) {
      return this.generateSimpleEmbed({
        description: ERROR_CODE_MESSAGE_MAP[config.error],
        variant: 'error',
      });
    }

    const configValue = config.value;

    if (!configValue.features.includes(feature)) {
      return this.generateSimpleEmbed({
        description: `Feature not enabled.`,
        variant: 'info',
      });
    }

    const updatedConfigDto: DiscordGuildDto = {
      ...configValue,
      features: configValue.features.filter((f) => f !== feature),
    };

    const updateConfig =
      await this.discordGuildService.update(updatedConfigDto);

    if (updateConfig.isErr()) {
      return this.generateSimpleEmbed({
        description: ERROR_CODE_MESSAGE_MAP[updateConfig.error],
        variant: 'error',
      });
    }

    return this.generateSimpleEmbed({
      description: `Feature removed.`,
      variant: 'success',
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
