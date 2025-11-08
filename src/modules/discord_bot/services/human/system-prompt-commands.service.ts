import { DiscordSettingKey } from '@Enums/discord-setting-key.enum';
import { HUMAN_COMMANDS_CONFIG } from '@Modules/discord_bot/configs/human-commands.config';
import { EmbedVariant } from '@Modules/discord_bot/types/embed-variant.type';
import { Injectable, Logger } from '@nestjs/common';
import { DiscordSettingsService } from '@Services/discord-settings.service';
import { EmbedBuilder } from 'discord.js';
import { EmbedBuilderService } from '../embed-builder.service';

@Injectable()
export class SystemPromptCommandsService {
  private readonly logger = new Logger(this.constructor.name);

  constructor(
    private readonly discordSettingsService: DiscordSettingsService,
    private readonly embedBuilderService: EmbedBuilderService,
  ) {}

  public async systemPromptGetHandler(): Promise<EmbedBuilder> {
    const systemPrompt =
      await this.discordSettingsService.getValueByKey<string>(
        DiscordSettingKey.HUMAN_SYSTEM_PROMPT,
      );

    if (systemPrompt.isErr()) {
      return this.generateSimpleEmbed({
        description: 'There was an error getting the system prompt.',
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
  }: {
    systemPrompt: string;
  }): Promise<EmbedBuilder> {
    const systemPromptSetting = await this.discordSettingsService.set(
      DiscordSettingKey.HUMAN_SYSTEM_PROMPT,
      systemPrompt,
    );

    if (systemPromptSetting.isErr()) {
      return this.generateSimpleEmbed({
        description: 'There was an error setting the system prompt.',
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
