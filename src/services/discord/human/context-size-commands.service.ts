import { HUMAN_COMMANDS_CONFIG } from '@Constants/discord/human-commands.constant';
import { ERROR_CODE_MESSAGE_MAP } from '@Constants/error-messages.constant';
import { DiscordSettingKey } from '@Enums/discord/discord-setting-key.enum';
import { Injectable, Logger } from '@nestjs/common';
import { DiscordSettingsService } from '@Services/discord-settings.service';
import { EmbedVariant } from '@Types/discord/embed-variant.type';
import { EmbedBuilder } from 'discord.js';
import { EmbedBuilderService } from '../embed-builder.service';

export const HUMAN_CONTEXT_SIZE_DEFAULT = 20;

@Injectable()
export class ContextSizeCommandsService {
  private readonly logger = new Logger(this.constructor.name);

  constructor(
    private readonly discordSettingsService: DiscordSettingsService,
    private readonly embedBuilderService: EmbedBuilderService,
  ) {}

  public async contextSizeGetHandler(guildId: string): Promise<EmbedBuilder> {
    const setting = await this.discordSettingsService.findByKey({
      key: DiscordSettingKey.HUMAN_CONTEXT_SIZE,
      guildId,
    });

    if (setting.isErr()) {
      return this.generateSimpleEmbed({
        description: `Context size is set to \`${HUMAN_CONTEXT_SIZE_DEFAULT}\` (default).`,
        variant: 'success',
      });
    }

    const value = setting.value.value as number;
    const updatedAt = setting.value.updatedAt;
    const timestamp = Math.floor(updatedAt.getTime() / 1000);

    return this.generateSimpleEmbed({
      description: `Context size is set to \`${value}\`.\nLast updated: <t:${timestamp}:F> (<t:${timestamp}:R>)`,
      variant: 'success',
    });
  }

  public async contextSizeSetHandler({
    value,
    guildId,
  }: {
    value: number;
    guildId: string;
  }): Promise<EmbedBuilder> {
    const result = await this.discordSettingsService.set({
      key: DiscordSettingKey.HUMAN_CONTEXT_SIZE,
      value: Math.round(value),
      guildId,
    });

    if (result.isErr()) {
      return this.generateSimpleEmbed({
        description: ERROR_CODE_MESSAGE_MAP[result.error],
        variant: 'error',
      });
    }

    return this.generateSimpleEmbed({
      description: `Context size set to \`${Math.round(value)}\`.`,
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
      title: HUMAN_COMMANDS_CONFIG.embed.title,
      thumbnail: HUMAN_COMMANDS_CONFIG.embed.thumbnail,
      variant,
      logger: this.logger,
    });
  }
}
