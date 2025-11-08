import { DiscordSettingKey } from '@Enums/discord-setting-key.enum';
import { GOOD_MORNING_COMMANDS_CONFIG } from '@Modules/discord_bot/configs/good-morning-commands.config';
import { EmbedVariant } from '@Modules/discord_bot/types/embed-variant.type';
import { Injectable, Logger } from '@nestjs/common';
import { DiscordSettingsService } from '@Services/discord-settings.service';
import { EmbedBuilder } from 'discord.js';
import { EmbedBuilderService } from '../embed-builder.service';

@Injectable()
export class QueryCommandsService {
  private readonly logger = new Logger(this.constructor.name);

  constructor(
    private readonly discordSettingsService: DiscordSettingsService,
    private readonly embedBuilderService: EmbedBuilderService,
  ) {}

  public async queryGetHandler(): Promise<EmbedBuilder> {
    const goodMorningQuery =
      await this.discordSettingsService.getValueByKey<string>(
        DiscordSettingKey.GOOD_MORNING_QUERY,
      );

    if (goodMorningQuery.isErr()) {
      return this.generateSimpleEmbed({
        description: 'There was an error getting the Good Morning query.',
        variant: 'error',
      });
    }

    const goodMorningQueryValue = goodMorningQuery.value;

    return this.generateSimpleEmbed({
      description: `Good Morning query is set to \`${goodMorningQueryValue}\`.`,
      variant: 'success',
    });
  }

  public async querySetHandler({
    query,
  }: {
    query: string;
  }): Promise<EmbedBuilder> {
    const goodMorningQuerySetting = await this.discordSettingsService.set(
      DiscordSettingKey.GOOD_MORNING_QUERY,
      query,
    );

    if (goodMorningQuerySetting.isErr()) {
      return this.generateSimpleEmbed({
        description: 'There was an error setting the Good Morning query.',
        variant: 'error',
      });
    }

    return this.generateSimpleEmbed({
      description: `Good Morning query set to \`${query}\`.`,
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
      title: GOOD_MORNING_COMMANDS_CONFIG.embed.title,
      thumbnail: GOOD_MORNING_COMMANDS_CONFIG.embed.thumbnail,
      variant: variant,
      logger: this.logger,
    });
  }
}
