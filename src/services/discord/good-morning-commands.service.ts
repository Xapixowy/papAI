import { DiscordChannelFeature } from '@Enums/discord/discord-channel-feature.enum';
import { DiscordSettingKey } from '@Enums/discord/discord-setting-key.enum';
import { Injectable, Logger } from '@nestjs/common';
import { TenorService } from '@Services/api/tenor.service';
import { DiscordChannelService } from '@Services/discord-channel.service';
import { DiscordGuildService } from '@Services/discord-guild.service';
import { DiscordSettingsService } from '@Services/discord-settings.service';

@Injectable()
export class GoodMorningCommandsService {
  private readonly logger = new Logger(this.constructor.name);

  constructor(
    private readonly discordSettingsService: DiscordSettingsService,
    private readonly discordGuildService: DiscordGuildService,
    private readonly discordChannelService: DiscordChannelService,
    private readonly tenorService: TenorService,
  ) {}

  public async goodMorningMessageHandler({
    guildId,
    channelId,
  }: {
    guildId: string;
    channelId: string;
  }): Promise<string | null> {
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

    const goodMorningQuerySettingValue = goodMorningQuerySetting.value;

    const gifResult = await this.tenorService.searchGifs({
      query: goodMorningQuerySettingValue,
      limit: 1,
      random: true,
    });

    if (gifResult.isErr()) {
      this.logger.error(
        'There was an error searching for a GIF.',
        gifResult.error,
      );
      return null;
    }

    const gifResultValue = gifResult.value;

    if (gifResultValue.results?.length === 0) {
      this.logger.error('No GIF found.');
      return null;
    }

    const gifUrl = gifResultValue.results[0]?.media_formats?.gif?.url;

    if (!gifUrl) {
      this.logger.error('No GIF URL found.');
      return null;
    }

    return gifUrl;
  }
}
