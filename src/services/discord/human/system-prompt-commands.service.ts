import { HUMAN_COMMANDS_CONFIG } from '@Constants/discord/human-commands.constant';
import { ERROR_CODE_MESSAGE_MAP } from '@Constants/error-messages.constant';
import { DiscordSettingKey } from '@Enums/discord/discord-setting-key.enum';
import { Injectable, Logger } from '@nestjs/common';
import { DiscordSettingsService } from '@Services/discord-settings.service';
import { EmbedVariant } from '@Types/discord/embed-variant.type';
import { EmbedBuilder } from 'discord.js';
import { EmbedBuilderService } from '../embed-builder.service';

@Injectable()
export class SystemPromptCommandsService {
  private readonly logger = new Logger(this.constructor.name);

  constructor(
    private readonly discordSettingsService: DiscordSettingsService,
    private readonly embedBuilderService: EmbedBuilderService,
  ) {}

  public async systemPromptGetHandler(guildId: string): Promise<EmbedBuilder> {
    const setting = await this.discordSettingsService.findByKey({
      key: DiscordSettingKey.HUMAN_SYSTEM_PROMPT,
      guildId,
    });

    if (setting.isErr()) {
      return this.generateSimpleEmbed({
        description: ERROR_CODE_MESSAGE_MAP[setting.error],
        variant: 'error',
      });
    }

    const value = setting.value.value as string;
    const timestamp = Math.floor(setting.value.updatedAt.getTime() / 1000);

    return this.generateSimpleEmbed({
      description: `System prompt is set to \`${value}\`.\n\nLast updated: <t:${timestamp}:F> (<t:${timestamp}:R>)`,
      variant: 'success',
    });
  }

  public async systemPromptSetHandler({
    systemPrompt,
    guildId,
  }: {
    systemPrompt: string;
    guildId: string;
  }): Promise<EmbedBuilder> {
    const systemPromptSetting = await this.discordSettingsService.set({
      key: DiscordSettingKey.HUMAN_SYSTEM_PROMPT,
      value: systemPrompt,
      guildId,
    });

    if (systemPromptSetting.isErr()) {
      return this.generateSimpleEmbed({
        description: ERROR_CODE_MESSAGE_MAP[systemPromptSetting.error],
        variant: 'error',
      });
    }

    return this.generateSimpleEmbed({
      description: `System prompt set to \`${systemPrompt}\`.`,
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
