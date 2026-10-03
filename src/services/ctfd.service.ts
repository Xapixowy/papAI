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
    const lock = await this.redis.set('ctfd:cron:lock', 'locked', 'EX', 30, 'NX');
    if (!lock) {
      return;
    }
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

      let scoreboard: any[] | null = null;
      try {
        scoreboard = await this.fetchScoreboard();
      } catch (error: any) {
        if (error.response?.status === 401 || error.response?.status === 403) {
          this.logger.log('Scoreboard fetch unauthorized, attempting re-login');
          await this.login(username, password);
          scoreboard = await this.fetchScoreboard();
        } else {
          throw error;
        }
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

      await this.redis.set('ctfd:chromeawesome:place', currentPlace.toString());
      await this.redis.set('ctfd:chromeawesome:scoreboard', JSON.stringify(scoreboard));

      if (cachedPlace && cachedPlace !== currentPlace) {
        this.logger.log(
          `ChromeAwesome place changed from ${cachedPlace} to ${currentPlace}!`,
        );
        await this.notifyPlaceChange(cachedPlace, currentPlace, ourTeam.score, scoreboard);
      }
    } catch (error) {
      this.logger.error('Error during CTFd scoreboard check:', error);
    }
  }

  private async login(name: string, password: string): Promise<void> {
    try {
      // 1. Get initial session cookie and CSRF nonce
      const getRes = await axios.get('https://reentry.ctfd.io/login', {
        validateStatus: (status) => status < 500,
      });

      const initialCookieHeader = getRes.headers['set-cookie'];
      let sessionCookie = '';
      if (initialCookieHeader && initialCookieHeader.length > 0) {
        const sessionMatch = initialCookieHeader.find((c: string) => c.startsWith('session='));
        if (sessionMatch) {
          sessionCookie = sessionMatch.split(';')[0];
        }
      }

      const nonceMatch = getRes.data?.match(/<input[^>]*name="nonce"[^>]*value="([^"]+)"/);
      if (!nonceMatch) {
        this.logger.error('Failed to extract CSRF nonce from login page.');
        return;
      }
      const nonce = nonceMatch[1];

      // 2. Post login form
      const params = new URLSearchParams();
      params.append('name', name);
      params.append('password', password);
      params.append('nonce', nonce);

      const postRes = await axios.post(
        'https://reentry.ctfd.io/login',
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            ...(sessionCookie ? { 'Cookie': sessionCookie } : {})
          },
          maxRedirects: 0,
          validateStatus: (status) => status >= 200 && status < 400,
        },
      );

      const setCookieHeader = postRes.headers['set-cookie'];
      if (setCookieHeader && setCookieHeader.length > 0) {
        const session = setCookieHeader.find((c: string) => c.startsWith('session='));
        if (session) {
          this.sessionCookie = session.split(';')[0];
          this.logger.log('Successfully authenticated to CTFd.');
          return;
        }
      }
      
      // If no new cookie but 302, maybe the old cookie got upgraded? Let's save it.
      if (postRes.status === 302 && sessionCookie) {
         this.sessionCookie = sessionCookie;
         this.logger.log('Successfully authenticated to CTFd (reused cookie).');
         return;
      }

      this.logger.error(
        'Failed to extract session cookie from login response.',
      );
    } catch (error) {
      this.logger.error('Failed to login to CTFd:', error);
      throw error;
    }
  }

  private async fetchScoreboard(): Promise<any[]> {
    if (!this.sessionCookie) {
       throw { response: { status: 401 } };
    }

    const response = await axios.get(
      'https://reentry.ctfd.io/api/v1/scoreboard',
      {
        headers: {
          Cookie: this.sessionCookie,
        },
      },
    );
    return response.data?.data;
  }

  private async notifyPlaceChange(
    oldPlace: number,
    newPlace: number,
    score: number,
    scoreboard: any[],
  ) {
    const settings = await this.discordSettingsService.findByKeyAllGuilds(
      DiscordSettingKey.CTFD_UPDATES_CHANNEL,
    );

    if (!settings.length) {
      this.logger.warn('No guilds have configured a CTFD_UPDATES_CHANNEL.');
      return;
    }

    const ourIndex = newPlace - 1;
    let description = `**ChromeAwesome** moved from **#${oldPlace}** to **#${newPlace}**! (Score: **${score}**)\n\n**Competition:**\n`;

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

    const embed = new EmbedBuilder()
      .setTitle('CTFd Scoreboard Update! 🏆')
      .setDescription(description)
      .setColor(newPlace < oldPlace ? 'Green' : 'Red')
      .setTimestamp();

    const channelIds = [...new Set(settings.map(s => s.value as string))];

    for (const channelId of channelIds) {
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
