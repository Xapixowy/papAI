import { ErrorCodeMessageMap } from '@Constants/error-messages.constant';
import { DiscordGuildConfigDto } from '@DTOs/discord-guild-config.dto';
import { DiscordFeature } from '@Enums/discord-feature.enum';
import { GUILD_COMMANDS_CONFIG } from '@Modules/discord_bot/configs/guild-comannds.config';
import { EmbedVariant } from '@Modules/discord_bot/types/embed-variant.type';
import { Injectable, Logger } from '@nestjs/common';
import { DiscordGuildConfigService } from '@Services/discord-guild-config.service';
import { EmbedBuilder } from 'discord.js';
import { EmbedBuilderService } from '../embed-builder.service';

@Injectable()
export class FeatureCommandsService {
  private readonly logger = new Logger(this.constructor.name);

  constructor(
    private readonly embedBuilderService: EmbedBuilderService,
    private readonly discordGuildConfigService: DiscordGuildConfigService,
  ) {}

  async addFeatureHandler({
    guildId,
    feature,
  }: {
    guildId: string;
    feature: DiscordFeature;
  }): Promise<EmbedBuilder> {
    const config = await this.discordGuildConfigService.findById({
      id: guildId,
    });

    if (config.isErr()) {
      return this.generateSimpleEmbed({
        description: ErrorCodeMessageMap[config.error],
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

    const updatedConfigDto: DiscordGuildConfigDto = {
      ...configValue,
      features: [...configValue.features, feature],
    };

    const updateConfig = await this.discordGuildConfigService.update({
      dto: updatedConfigDto,
    });

    if (updateConfig.isErr()) {
      return this.generateSimpleEmbed({
        description: ErrorCodeMessageMap[updateConfig.error],
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
    const config = await this.discordGuildConfigService.findById({
      id: guildId,
    });

    if (config.isErr()) {
      return this.generateSimpleEmbed({
        description: ErrorCodeMessageMap[config.error],
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

    const updatedConfigDto: DiscordGuildConfigDto = {
      ...configValue,
      features: configValue.features.filter((f) => f !== feature),
    };

    const updateConfig = await this.discordGuildConfigService.update({
      dto: updatedConfigDto,
    });

    if (updateConfig.isErr()) {
      return this.generateSimpleEmbed({
        description: ErrorCodeMessageMap[updateConfig.error],
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
