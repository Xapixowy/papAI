import { DiscordSettingKey } from '@Enums/discord-setting-key.enum';
import { Injectable } from '@nestjs/common';
import { TenorService } from '@Services/api/tenor.service';
import { DiscordSettingsService } from '@Services/discord-settings.service';
import { EmbedBuilder } from 'discord.js';
import { HUMAN_COMMANDS_CONFIG } from '../configs/human-commands.config';
import { EmbedVariant } from '../types/embed-variant.type';
import { EmbedBuilderService } from './embed-builder.service';

@Injectable()
export class HumanCommandsService {
  constructor(
    private readonly discordSettingsService: DiscordSettingsService,
    private readonly embedBuilderService: EmbedBuilderService,
    private readonly tenorService: TenorService,
  ) {}

  public async configGetGMGIFQueryHandler(): Promise<EmbedBuilder> {
    const gmGifQuery = await this.discordSettingsService.getValueByKey<string>(
      DiscordSettingKey.HUMAN_GM_GIF_QUERY,
    );

    if (gmGifQuery.isErr()) {
      return this.generateSimpleEmbed({
        description: 'There was an error getting the GM GIF query.',
        variant: 'error',
      });
    }

    const gmGifQueryValue = gmGifQuery.value;

    return this.generateSimpleEmbed({
      description: `GM GIF query is set to \`${gmGifQueryValue}\`.`,
      variant: 'success',
    });
  }

  public async configSetGMGIFQueryHandler({
    gmGifQuery,
  }: {
    gmGifQuery: string;
  }): Promise<EmbedBuilder> {
    const gmGifQuerySetting = await this.discordSettingsService.set(
      DiscordSettingKey.HUMAN_GM_GIF_QUERY,
      gmGifQuery,
    );

    if (gmGifQuerySetting.isErr()) {
      return this.generateSimpleEmbed({
        description: 'There was an error setting the GM GIF query.',
        variant: 'error',
      });
    }

    return this.generateSimpleEmbed({
      description: `GM GIF query set to \`${gmGifQuery}\`.`,
      variant: 'success',
    });
  }

  public async gmMessageHandler(): Promise<string | EmbedBuilder> {
    const gmGifQuery = await this.discordSettingsService.getValueByKey<string>(
      DiscordSettingKey.HUMAN_GM_GIF_QUERY,
    );

    if (gmGifQuery.isErr()) {
      return this.generateSimpleEmbed({
        description: 'There was an error getting the GM GIF query.',
        variant: 'error',
      });
    }

    const gmGifQueryValue = gmGifQuery.value;

    const gifResult = await this.tenorService.searchGifs({
      query: gmGifQueryValue,
      limit: 1,
      random: true,
    });

    if (gifResult.isErr()) {
      return this.generateSimpleEmbed({
        description: 'There was an error searching for a GIF.',
        variant: 'error',
      });
    }

    const gifResultValue = gifResult.value;

    if (gifResultValue.results?.length === 0) {
      return this.generateSimpleEmbed({
        description: 'No GIF found.',
        variant: 'error',
      });
    }

    const gifUrl = gifResultValue.results[0]?.media_formats?.gif?.url;

    if (!gifUrl) {
      return this.generateSimpleEmbed({
        description: 'No GIF URL found.',
        variant: 'error',
      });
    }

    return gifUrl;
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
    });
  }
}
