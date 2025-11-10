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
    const systemPrompt =
      await this.discordSettingsService.getValueByKey<string>({
        key: DiscordSettingKey.HUMAN_SYSTEM_PROMPT,
        guildId,
      });

    if (systemPrompt.isErr()) {
      return this.generateSimpleEmbed({
        description: ERROR_CODE_MESSAGE_MAP[systemPrompt.error],
        variant: 'error',
      });
    }

    const systemPromptValue = systemPrompt.value;

    return this.generateSimpleEmbed({
      description: `System prompt is set to \`${systemPromptValue}\`.`,
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
