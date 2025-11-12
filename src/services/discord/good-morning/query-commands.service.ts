import { GOOD_MORNING_COMMANDS_CONFIG } from '@Constants/discord/good-morning-commands.constant';
import { ERROR_CODE_MESSAGE_MAP } from '@Constants/error-messages.constant';
import { DiscordSettingKey } from '@Enums/discord/discord-setting-key.enum';
import { Injectable, Logger } from '@nestjs/common';
import { DiscordSettingsService } from '@Services/discord-settings.service';
import { EmbedVariant } from '@Types/discord/embed-variant.type';
import { EmbedBuilder } from 'discord.js';
import { EmbedBuilderService } from '../embed-builder.service';

@Injectable()
export class QueryCommandsService {
  private readonly logger = new Logger(this.constructor.name);

  constructor(
    private readonly discordSettingsService: DiscordSettingsService,
    private readonly embedBuilderService: EmbedBuilderService,
  ) {}

  public async queryGetHandler(guildId: string): Promise<EmbedBuilder> {
    const goodMorningQuery =
      await this.discordSettingsService.getValueByKey<string>({
        key: DiscordSettingKey.GOOD_MORNING_QUERY,
        guildId,
      });

    if (goodMorningQuery.isErr()) {
      return this.generateSimpleEmbed({
        description: ERROR_CODE_MESSAGE_MAP[goodMorningQuery.error],
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
    guildId,
  }: {
    query: string;
    guildId: string;
  }): Promise<EmbedBuilder> {
    const goodMorningQuerySetting = await this.discordSettingsService.set({
      key: DiscordSettingKey.GOOD_MORNING_QUERY,
      value: query,
      guildId,
    });

    if (goodMorningQuerySetting.isErr()) {
      return this.generateSimpleEmbed({
        description: ERROR_CODE_MESSAGE_MAP[goodMorningQuerySetting.error],
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
