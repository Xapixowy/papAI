import { GIF_PROVIDERS, GifProvider } from '@Constants/gif-providers.constant';
import { DiscordChannelFeature } from '@Enums/discord/discord-channel-feature.enum';
import { DiscordSettingKey } from '@Enums/discord/discord-setting-key.enum';
import { Injectable, Logger } from '@nestjs/common';
import { GiphyService } from '@Services/api/giphy.service';
import { KlipyService } from '@Services/api/klipy.service';
import { TenorService } from '@Services/api/tenor.service';
import { DiscordChannelService } from '@Services/discord-channel.service';
import { DiscordGuildService } from '@Services/discord-guild.service';
import { DiscordSettingsService } from '@Services/discord-settings.service';
import { EmbedBuilder } from 'discord.js';

@Injectable()
export class GoodMorningCommandsService {
  private readonly logger = new Logger(this.constructor.name);

  constructor(
    private readonly discordSettingsService: DiscordSettingsService,
    private readonly discordGuildService: DiscordGuildService,
    private readonly discordChannelService: DiscordChannelService,
    private readonly tenorService: TenorService,
    private readonly giphyService: GiphyService,
    private readonly klipyService: KlipyService,
  ) {}

  public async goodMorningMessageHandler({
    guildId,
    channelId,
  }: {
    guildId: string;
    channelId: string;
  }): Promise<EmbedBuilder | null> {
    const isFeatureOnChannelEnabled =
      await this.discordChannelService.isFeatureEnabled({
        channelId,
        feature: DiscordChannelFeature.GOOD_MORNING_MESSAGES,
      });

    if (
      !isFeatureOnChannelEnabled.isErr() &&
      isFeatureOnChannelEnabled.value === false
    ) {
      return null;
    }

    const isFeatureOnChannelDefaultEnabled =
      await this.discordGuildService.isChannelFeatureEnabled({
        guildId,
        feature: DiscordChannelFeature.GOOD_MORNING_MESSAGES,
      });

    if (
      isFeatureOnChannelEnabled.isErr() &&
      (isFeatureOnChannelDefaultEnabled.isErr() ||
        !isFeatureOnChannelDefaultEnabled.value)
    ) {
      return null;
    }

    const goodMorningQuerySetting =
      await this.discordSettingsService.getValueByKey<string>({
        key: DiscordSettingKey.GOOD_MORNING_QUERY,
        guildId,
      });

    if (goodMorningQuerySetting.isErr()) {
      this.logger.error(
        'There was an error getting the Good Morning query.',
        goodMorningQuerySetting.error,
      );
      return null;
    }

    const result = await this.fetchGifUrl(goodMorningQuerySetting.value);
    if (!result) return null;

    this.logger.log(`Good Morning GIF fetched via ${result.provider.name}.`);

    return new EmbedBuilder()
      .setImage(result.url)
      .setAuthor({ name: `Powered by ${result.provider.name}`, url: result.provider.url });
  }

  private async fetchGifUrl(
    query: string,
  ): Promise<{ url: string; provider: GifProvider } | null> {
    const providers = this.shuffled([
      () => this.fetchTenorGif(query),
      () => this.fetchGiphyGif(query),
      () => this.fetchKlipyGif(query),
    ]);

    for (const fetch of providers) {
      const result = await fetch();
      if (result) return result;
    }

    this.logger.error('All GIF providers failed to return a result.');
    return null;
  }

  private async fetchTenorGif(
    query: string,
  ): Promise<{ url: string; provider: GifProvider } | null> {
    const result = await this.tenorService.searchGifs({
      query,
      limit: 1,
      randomize: true,
    });

    if (result.isErr()) {
      this.logger.error('Tenor GIF search failed.', result.error);
      return null;
    }

    const url = result.value.results[0]?.media_formats?.gif?.url;
    return url ? { url, provider: GIF_PROVIDERS.tenor } : null;
  }

  private async fetchGiphyGif(
    query: string,
  ): Promise<{ url: string; provider: GifProvider } | null> {
    const result = await this.giphyService.searchGifs({
      query,
      limit: 10,
      randomize: true,
    });

    if (result.isErr()) {
      this.logger.error('Giphy GIF search failed.', result.error);
      return null;
    }

    const gifs = result.value.data;
    if (!gifs.length) return null;

    const random = gifs[Math.floor(Math.random() * gifs.length)];
    const url = random?.images?.original?.url;
    return url ? { url, provider: GIF_PROVIDERS.giphy } : null;
  }

  private async fetchKlipyGif(
    query: string,
  ): Promise<{ url: string; provider: GifProvider } | null> {
    const result = await this.klipyService.searchGifs({
      query,
      limit: 10,
      randomize: true,
    });

    if (result.isErr()) {
      this.logger.error('Klipy GIF search failed.', result.error);
      return null;
    }

    if (!result.value.result) {
      this.logger.error('Klipy returned unsuccessful result.');
      return null;
    }

    const gifs = result.value.data.data;
    if (!gifs.length) return null;

    const random = gifs[Math.floor(Math.random() * gifs.length)];
    const url = random?.file?.md?.gif?.url;
    return url ? { url, provider: GIF_PROVIDERS.klipy } : null;
  }

  private shuffled<T>(arr: T[]): T[] {
    return [...arr].sort(() => Math.random() - 0.5);
  }
}
