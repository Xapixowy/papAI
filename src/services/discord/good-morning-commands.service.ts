import { DiscordFeature } from '@Enums/discord/discord-feature.enum';
import { DiscordSettingKey } from '@Enums/discord/discord-setting-key.enum';
import { Injectable, Logger } from '@nestjs/common';
import { TenorService } from '@Services/api/tenor.service';
import { DiscordGuildService } from '@Services/discord-guild.service';
import { DiscordSettingsService } from '@Services/discord-settings.service';

@Injectable()
export class GoodMorningCommandsService {
  private readonly logger = new Logger(this.constructor.name);

  constructor(
    private readonly discordSettingsService: DiscordSettingsService,
    private readonly discordGuildService: DiscordGuildService,
    private readonly tenorService: TenorService,
  ) {}

  public async goodMorningMessageHandler(
    guildId: string,
  ): Promise<string | null> {
    const isFeatureOnGuildEnabled =
      await this.discordGuildService.isFeatureEnabled({
        guildId,
        feature: DiscordFeature.GOOD_MORNING,
      });

    if (isFeatureOnGuildEnabled.isErr() || !isFeatureOnGuildEnabled.value) {
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
