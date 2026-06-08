import { STEAM_CONFIG } from '@Constants/steam-config.constant';
import { ErrorCode } from '@Enums/error-code.enum';
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import {
  SteamAppDetails,
  SteamOwnedGame,
  SteamPlayerSummary,
} from '@Types/steam/steam-api.type';
import { AxiosError, AxiosResponse } from 'axios';
import { catchError, firstValueFrom, map } from 'rxjs';
import { err, ok, Result } from 'neverthrow';

@Injectable()
export class SteamApiService {
  private readonly logger = new Logger(SteamApiService.name);

  constructor(private readonly httpService: HttpService) {}

  async resolveVanityUrl(
    vanityUrl: string,
  ): Promise<Result<string, ErrorCode>> {
    try {
      const response = await firstValueFrom(
        this.httpService
          .get<{
            response: { success: number; steamid?: string };
          }>('ISteamUser/ResolveVanityURL/v0001/', {
            params: { vanityurl: vanityUrl },
          })
          .pipe(
            map(
              (
                r: AxiosResponse<{
                  response: { success: number; steamid?: string };
                }>,
              ) => r.data,
            ),
            catchError((error: AxiosError) => {
              this.logger.error(`ResolveVanityURL error: ${error.message}`);
              throw error;
            }),
          ),
      );

      if (response.response.success !== 1 || !response.response.steamid) {
        return err(ErrorCode.STEAM_USER_NOT_FOUND);
      }

      return ok(response.response.steamid);
    } catch {
      return err(ErrorCode.STEAM_API_ERROR);
    }
  }

  async getPlayerSummary(
    steamId: string,
  ): Promise<Result<SteamPlayerSummary, ErrorCode>> {
    try {
      const response = await firstValueFrom(
        this.httpService
          .get<{
            response: { players: SteamPlayerSummary[] };
          }>('ISteamUser/GetPlayerSummaries/v0002/', {
            params: { steamids: steamId },
          })
          .pipe(
            map(
              (
                r: AxiosResponse<{
                  response: { players: SteamPlayerSummary[] };
                }>,
              ) => r.data,
            ),
            catchError((error: AxiosError) => {
              this.logger.error(`GetPlayerSummaries error: ${error.message}`);
              throw error;
            }),
          ),
      );

      const player = response.response.players[0];
      if (!player) {
        return err(ErrorCode.STEAM_USER_NOT_FOUND);
      }

      return ok(player);
    } catch {
      return err(ErrorCode.STEAM_API_ERROR);
    }
  }

  async getOwnedGames(
    steamId: string,
  ): Promise<Result<SteamOwnedGame[], ErrorCode>> {
    try {
      const response = await firstValueFrom(
        this.httpService
          .get<{
            response: { game_count?: number; games?: SteamOwnedGame[] };
          }>('IPlayerService/GetOwnedGames/v0001/', {
            params: {
              steamid: steamId,
              include_appinfo: 1,
              include_played_free_games: 1,
            },
          })
          .pipe(
            map(
              (
                r: AxiosResponse<{
                  response: {
                    game_count?: number;
                    games?: SteamOwnedGame[];
                  };
                }>,
              ) => r.data,
            ),
            catchError((error: AxiosError) => {
              this.logger.error(`GetOwnedGames error: ${error.message}`);
              throw error;
            }),
          ),
      );

      return ok(response.response.games ?? []);
    } catch {
      return err(ErrorCode.STEAM_API_ERROR);
    }
  }

  async getAppDetails(
    appId: number,
  ): Promise<Result<SteamAppDetails, ErrorCode>> {
    try {
      const response = await fetch(
        `https://store.steampowered.com/api/appdetails?appids=${appId}&l=${STEAM_CONFIG.language}&cc=${STEAM_CONFIG.currencyCountryCode}`,
      );
      const json = (await response.json()) as Record<
        string,
        { success: boolean; data?: SteamAppDetails }
      >;
      const appData = json[appId.toString()];

      if (!appData?.success || !appData?.data) {
        return err(ErrorCode.STEAM_GAME_NOT_FOUND);
      }

      return ok(appData.data);
    } catch {
      return err(ErrorCode.STEAM_API_ERROR);
    }
  }

  isVanityUrl(input: string): boolean {
    return !/^\d+$/.test(input);
  }
}
