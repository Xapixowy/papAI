import { HUMAN_COMMANDS_CONFIG } from '@Constants/discord/human-commands.constant';
import { ERROR_CODE_MESSAGE_MAP } from '@Constants/error-messages.constant';
import { DiscordSettingKey } from '@Enums/discord/discord-setting-key.enum';
import { Injectable, Logger } from '@nestjs/common';
import { DiscordSettingsService } from '@Services/discord-settings.service';
import { EmbedVariant } from '@Types/discord/embed-variant.type';
import { EmbedBuilder } from 'discord.js';
import { EmbedBuilderService } from '../embed-builder.service';

@Injectable()
export class RandomReplyPercentageCommandsService {
  private readonly logger = new Logger(this.constructor.name);

  constructor(
    private readonly discordSettingsService: DiscordSettingsService,
    private readonly embedBuilderService: EmbedBuilderService,
  ) {}

  public async randomReplyPercentageGetHandler(
    guildId: string,
  ): Promise<EmbedBuilder> {
    const setting = await this.discordSettingsService.findByKey({
      key: DiscordSettingKey.HUMAN_RANDOM_REPLY_PERCENTAGE,
      guildId,
    });

    if (setting.isErr()) {
      return this.generateSimpleEmbed({
        description: ERROR_CODE_MESSAGE_MAP[setting.error],
        variant: 'error',
      });
    }

    const value = setting.value.value as number;
    const timestamp = Math.floor(setting.value.updatedAt.getTime() / 1000);

    return this.generateSimpleEmbed({
      description: `Random reply percentage is set to \`${value}\`.\nLast updated: <t:${timestamp}:F> (<t:${timestamp}:R>)`,
      variant: 'success',
    });
  }

  public async randomReplyPercentageSetHandler({
    value,
    guildId,
  }: {
    value: number;
    guildId: string;
  }): Promise<EmbedBuilder> {
    const randomReplyPercentageSetting = await this.discordSettingsService.set({
      key: DiscordSettingKey.HUMAN_RANDOM_REPLY_PERCENTAGE,
      value: Math.round(value),
      guildId,
    });

    if (randomReplyPercentageSetting.isErr()) {
      return this.generateSimpleEmbed({
        description: ERROR_CODE_MESSAGE_MAP[randomReplyPercentageSetting.error],
        variant: 'error',
      });
    }

    return this.generateSimpleEmbed({
      description: `Random reply percentage set to \`${value}\`.`,
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
      description: description,
      title: HUMAN_COMMANDS_CONFIG.embed.title,
      thumbnail: HUMAN_COMMANDS_CONFIG.embed.thumbnail,
      variant: variant,
      logger: this.logger,
    });
  }
}
