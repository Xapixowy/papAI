import { STEAM_CONFIG } from '@Constants/steam-config.constant';
import { ErrorCode } from '@Enums/error-code.enum';
import { CronjobName } from '@Enums/cronjob-name.enum';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Events } from 'discord.js';
import { SteamApiService } from '@Services/api/steam.service';
import { DiscordSteamObserversService } from '@Services/discord-steam-observers.service';
import { SteamGamesService } from '@Services/steam-games.service';
import { SteamUserGamesService } from '@Services/steam-user-games.service';
import { SteamUsersService } from '@Services/steam-users.service';
import { Client, TextChannel } from 'discord.js';
import { SteamObserverEmbedBuilderService } from './steam-observer-embed-builder.service';

type ObserverRef = { steamUserId: string; discordChannelId: string };

export interface EnrichResult {
  enriched: number;
  notFound: number;
  failed: number;
  skipped: number;
}

@Injectable()
export class SteamObserverSchedulerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(this.constructor.name);

  constructor(
    private readonly client: Client,
    private readonly steamApiService: SteamApiService,
    private readonly steamUsersService: SteamUsersService,
    private readonly steamGamesService: SteamGamesService,
    private readonly steamUserGamesService: SteamUserGamesService,
    private readonly discordSteamObserversService: DiscordSteamObserversService,
    private readonly embedBuilderService: SteamObserverEmbedBuilderService,
  ) {}

  onApplicationBootstrap(): void {
    this.client.once(Events.ClientReady, () => {
      void this.checkNewGames();
    });
  }

  @Cron('*/15 * * * *', { name: CronjobName.STEAM_OBSERVER_CHECK })
  async checkNewGames(): Promise<void> {
    this.logger.log('Running Steam observer check...');
    const observers = await this.discordSteamObserversService.findAll();
    if (!observers.length) return;

    const uniqueSteamUserIds = [
      ...new Set(observers.map((o) => o.steamUserId)),
    ];
    await this.runForSteamUserIds(uniqueSteamUserIds, observers);
  }

  async enrichAllForSteamUserIds(
    steamUserIds: string[],
  ): Promise<EnrichResult> {
    const gameIds =
      await this.steamUserGamesService.findAllGameIdsByUserIds(steamUserIds);
    return this.enrichGames(gameIds);
  }

  async runForSteamUserIds(
    steamUserIds: string[],
    observers: ObserverRef[],
  ): Promise<number> {
    let totalNewGames = 0;

    for (const steamUserId of steamUserIds) {
      try {
        totalNewGames += await this.processUser(steamUserId, observers);
      } catch (error) {
        this.logger.error(
          `Error processing Steam user ${steamUserId}: ${error}`,
        );
      }
    }

    return totalNewGames;
  }

  private async processUser(
    steamUserId: string,
    allObservers: ObserverRef[],
  ): Promise<number> {
    const gamesResult = await this.steamApiService.getOwnedGames(steamUserId);
    if (gamesResult.isErr()) return 0;

    const ownedGames = gamesResult.value;
    if (!ownedGames.length) return 0;

    const existingGameIds =
      await this.steamUserGamesService.findGameIdsBySteamUserId(steamUserId);
    const existingSet = new Set(existingGameIds);

    const newGames = ownedGames.filter((g) => !existingSet.has(g.appid));
    if (!newGames.length) return 0;

    await this.steamGamesService.upsertMany(newGames);
    await this.steamUserGamesService.createMany(
      steamUserId,
      newGames.map((g) => g.appid),
    );

    await this.enrichGames(newGames.map((g) => g.appid));

    const steamUserResult = await this.steamUsersService.findById(steamUserId);
    const steamUser = steamUserResult.isOk() ? steamUserResult.value : null;

    const gameEntities = await this.steamGamesService.findByIds(
      newGames.map((g) => g.appid),
    );

    const userObservers = allObservers.filter(
      (o) => o.steamUserId === steamUserId,
    );

    for (const game of gameEntities) {
      const embed = this.embedBuilderService.newGameNotification({
        steamUser,
        game,
      });

      for (const observer of userObservers) {
        try {
          const channel = await this.client.channels.fetch(
            observer.discordChannelId,
          );
          if (!(channel instanceof TextChannel)) continue;
          await channel.send({ embeds: [embed] });
        } catch (error) {
          this.logger.error(
            `Failed to send notification to channel ${observer.discordChannelId}: ${error}`,
          );
        }
      }
    }

    return newGames.length;
  }

  async enrichGames(appIds: number[]): Promise<EnrichResult> {
    const unenrichedIds = await this.steamGamesService.findUnenrichedIds(appIds);
    const result: EnrichResult = {
      enriched: 0,
      notFound: 0,
      failed: 0,
      skipped: appIds.length - unenrichedIds.length,
    };
    appIds = unenrichedIds;

    for (const appId of appIds) {
      const details = await this.steamApiService.getAppDetails(appId);
      if (details.isOk()) {
        await this.steamGamesService.updateWithDetails(appId, details.value);
        result.enriched++;
      } else if (details.error === ErrorCode.STEAM_GAME_NOT_FOUND) {
        result.notFound++;
      } else {
        this.logger.error(`Steam API error enriching game ${appId}`);
        result.failed++;
      }
      await new Promise((resolve) =>
        setTimeout(resolve, STEAM_CONFIG.enrichDelayMs),
      );
    }

    return result;
  }
}
