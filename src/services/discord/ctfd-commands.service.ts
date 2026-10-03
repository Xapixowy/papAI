import { CTFD_COMMANDS_CONFIG } from '@Constants/discord/ctfd-commands.constant';
import { DiscordSettingKey } from '@Enums/discord/discord-setting-key.enum';
import { Injectable, Logger } from '@nestjs/common';
import { DiscordSettingsService } from '@Services/discord-settings.service';
import { EmbedBuilder } from 'discord.js';

@Injectable()
export class CtfdCommandsService {
  private readonly logger = new Logger(CtfdCommandsService.name);

  constructor(
    private readonly discordSettingsService: DiscordSettingsService,
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
}
