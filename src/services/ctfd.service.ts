import { EnvKey } from '@Enums/env-key.enum';
import { DiscordSettingKey } from '@Enums/discord/discord-setting-key.enum';
import { ProviderToken } from '@Enums/provider-token.enum';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DiscordSettingsService } from '@Services/discord-settings.service';
import axios from 'axios';
import { Client, EmbedBuilder, TextChannel } from 'discord.js';
import Redis from 'ioredis';

@Injectable()
export class CtfdService {
  private readonly logger = new Logger(CtfdService.name);
  private sessionCookie: string | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly discordSettingsService: DiscordSettingsService,
    @Inject(ProviderToken.REDIS) private readonly redis: Redis,
    private readonly client: Client,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async checkScoreboard() {
    const username = this.configService.get<string>(EnvKey.CTFD_USERNAME);
    const password = this.configService.get<string>(EnvKey.CTFD_PASSWORD);

    if (!username || !password) {
      this.logger.warn('CTFD credentials not set. Skipping check.');
      return;
    }

    try {
      if (!this.sessionCookie) {
        await this.login(username, password);
      }

      let scoreboard = await this.fetchScoreboard();

      // If we get unauthorized or error, try relogging once
      if (!scoreboard) {
        this.logger.log('Scoreboard fetch failed, attempting re-login');
        await this.login(username, password);
        scoreboard = await this.fetchScoreboard();
      }

      if (!scoreboard) {
        this.logger.error('Failed to fetch CTFd scoreboard.');
        return;
      }

      const ourTeam = scoreboard.find((t: any) => t.name === 'ChromeAwesome');
      if (!ourTeam) {
        this.logger.warn('Team ChromeAwesome not found in scoreboard.');
        return;
      }

      const currentPlace =
        scoreboard.findIndex((t: any) => t.name === 'ChromeAwesome') + 1;
      const cachedPlaceStr = await this.redis.get('ctfd:chromeawesome:place');
      const cachedPlace = cachedPlaceStr ? parseInt(cachedPlaceStr, 10) : null;

      if (cachedPlace && cachedPlace !== currentPlace) {
        this.logger.log(
          `ChromeAwesome place changed from ${cachedPlace} to ${currentPlace}!`,
        );
        await this.notifyPlaceChange(cachedPlace, currentPlace, ourTeam.score);
      }

      await this.redis.set('ctfd:chromeawesome:place', currentPlace.toString());
    } catch (error) {
      this.logger.error('Error during CTFd scoreboard check:', error);
    }
  }

  private async login(name: string, password: string): Promise<void> {
    try {
      const response = await axios.post(
        'https://reentry.ctfd.io/api/v1/login',
        { name, password },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          validateStatus: (status) => status < 500,
        },
      );

      const setCookieHeader = response.headers['set-cookie'];
      if (setCookieHeader && setCookieHeader.length > 0) {
        // Extract session cookie
        const session = setCookieHeader.find((c) => c.startsWith('session='));
        if (session) {
          this.sessionCookie = session.split(';')[0];
          this.logger.log('Successfully authenticated to CTFd.');
          return;
        }
      }
      this.logger.error(
        'Failed to extract session cookie from login response.',
      );
    } catch (error) {
      this.logger.error('Failed to login to CTFd:', error);
      throw error;
    }
  }

  private async fetchScoreboard(): Promise<any[] | null> {
    if (!this.sessionCookie) return null;

    try {
      const response = await axios.get(
        'https://reentry.ctfd.io/api/v1/scoreboard',
        {
          headers: {
            Cookie: this.sessionCookie,
          },
        },
      );
      return response.data?.data;
    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        return null;
      }
      this.logger.error('Error fetching CTFd scoreboard:', error);
      return null;
    }
  }

  private async notifyPlaceChange(
    oldPlace: number,
    newPlace: number,
    score: number,
  ) {
    const settings = await this.discordSettingsService.findByKeyAllGuilds(
      DiscordSettingKey.CTFD_UPDATES_CHANNEL,
    );

    if (!settings.length) {
      this.logger.warn('No guilds have configured a CTFD_UPDATES_CHANNEL.');
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('CTFd Scoreboard Update! 🏆')
      .setDescription(
        `**ChromeAwesome** has changed place!\n\nOld Place: **#${oldPlace}**\nNew Place: **#${newPlace}**\nScore: **${score}**`,
      )
      .setColor(newPlace < oldPlace ? 'Green' : 'Red')
      .setTimestamp();

    for (const setting of settings) {
      const channelId = setting.value as string;
      try {
        const channel = await this.client.channels.fetch(channelId);
        if (channel && channel instanceof TextChannel) {
          await channel.send({ embeds: [embed] });
        }
      } catch (error) {
        this.logger.error(
          `Failed to send CTFd update to channel ${channelId}:`,
          error,
        );
      }
    }
  }
}
