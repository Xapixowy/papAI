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
      const cachedScoreboardStr = await this.redis.get('ctfd:chromeawesome:scoreboard');
      const cachedPlace = cachedPlaceStr ? parseInt(cachedPlaceStr, 10) : null;
      const scoreboard = cachedScoreboardStr ? JSON.parse(cachedScoreboardStr) : null;

      if (cachedPlace && scoreboard) {
        const ourIndex = cachedPlace - 1;
        const score = scoreboard[ourIndex]?.score ?? 0;
        let description = `Team **ChromeAwesome** is currently in **#${cachedPlace}** place! 🏆 (Score: **${score}**)\n\n**Competition:**\n`;

        const indicesToPrint = new Set<number>();
        for (let i = 0; i < Math.min(3, scoreboard.length); i++) indicesToPrint.add(i);
        for (let i = Math.max(0, ourIndex - 2); i <= Math.min(scoreboard.length - 1, ourIndex + 2); i++) indicesToPrint.add(i);
        indicesToPrint.add(scoreboard.length - 1);

        const sortedIndices = Array.from(indicesToPrint).sort((a, b) => a - b);
        
        for (let i = 0; i < sortedIndices.length; i++) {
           const index = sortedIndices[i];
           const team = scoreboard[index];
           const place = index + 1;
           
           if (i > 0 && sortedIndices[i - 1] < index - 1) {
              description += `...\n`;
           }
           
           let prefix = '🔻';
           if (place === 1) prefix = '🥇';
           else if (place === 2) prefix = '🥈';
           else if (place === 3) prefix = '🥉';
           else if (index === scoreboard.length - 1) prefix = '🏁';
           
           if (index === ourIndex) prefix = '🟢';
           
           description += `${prefix} **#${place}** **${team.name}** • ${team.score}\n`;
        }

        embed
          .setDescription(description)
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
