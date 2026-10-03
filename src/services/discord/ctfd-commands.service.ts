import { CTFD_COMMANDS_CONFIG } from '@Constants/discord/ctfd-commands.constant';
import { DiscordSettingKey } from '@Enums/discord/discord-setting-key.enum';
import { ProviderToken } from '@Enums/provider-token.enum';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { DiscordSettingsService } from '@Services/discord-settings.service';
import { EmbedBuilder } from 'discord.js';
import Redis from 'ioredis';

@Injectable()
export class CtfdCommandsService {
  private readonly logger = new Logger(CtfdCommandsService.name);

  constructor(
    private readonly discordSettingsService: DiscordSettingsService,
    @Inject(ProviderToken.REDIS) private readonly redis: Redis,
  ) {}

  public async setChannelHandler(data: {
    guildId: string;
    channelId: string;
  }): Promise<EmbedBuilder[]> {
    const embed = new EmbedBuilder().setTitle(CTFD_COMMANDS_CONFIG.embed.title);

    if (CTFD_COMMANDS_CONFIG.embed.thumbnail) {
      embed.setThumbnail(CTFD_COMMANDS_CONFIG.embed.thumbnail);
    }

    try {
      await this.discordSettingsService.set({
        guildId: data.guildId,
        key: DiscordSettingKey.CTFD_UPDATES_CHANNEL,
        value: data.channelId,
      });

      embed
        .setDescription(
          `Successfully set CTFd updates channel to <#${data.channelId}>`,
        )
        .setColor('Green');
    } catch (error) {
      this.logger.error('Failed to set CTFd updates channel:', error);
      embed
        .setDescription('Failed to set CTFd updates channel.')
        .setColor('Red');
    }

    return [embed];
  }

  public async checkPlaceHandler(): Promise<EmbedBuilder[]> {
    const embed = new EmbedBuilder().setTitle(CTFD_COMMANDS_CONFIG.embed.title);

    if (CTFD_COMMANDS_CONFIG.embed.thumbnail) {
      embed.setThumbnail(CTFD_COMMANDS_CONFIG.embed.thumbnail);
    }

    try {
      const cachedPlaceStr = await this.redis.get('ctfd:chromeawesome:place');
      const cachedPlace = cachedPlaceStr ? parseInt(cachedPlaceStr, 10) : null;

      if (cachedPlace) {
        embed
          .setDescription(`Team **ChromeAwesome** is currently in **#${cachedPlace}** place! 🏆`)
          .setColor('Blue');
      } else {
        embed
          .setDescription('Could not determine the current place. Please wait for the next minute check.')
          .setColor('Orange');
      }
    } catch (error) {
      this.logger.error('Failed to get CTFd place from redis:', error);
      embed
        .setDescription('An error occurred while fetching the place.')
        .setColor('Red');
    }

    return [embed];
  }
}
