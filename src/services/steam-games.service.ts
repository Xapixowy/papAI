import { SteamGame } from '@Database/entities/steam-game.entity';
import { ErrorCode } from '@Enums/error-code.enum';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SteamAppDetails, SteamOwnedGame } from '@Types/steam/steam-api.type';
import { err, ok, Result } from 'neverthrow';
import { Repository } from 'typeorm';

@Injectable()
export class SteamGamesService {
  constructor(
    @InjectRepository(SteamGame)
    private readonly repository: Repository<SteamGame>,
  ) {}

  async findById(id: number): Promise<Result<SteamGame, ErrorCode>> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? ok(entity) : err(ErrorCode.STEAM_GAME_NOT_FOUND);
  }

  async findUnenrichedIds(ids: number[]): Promise<number[]> {
    if (!ids.length) return [];
    const entities = await this.repository
      .createQueryBuilder('sg')
      .where('sg.id IN (:...ids)', { ids })
      .andWhere('sg.description IS NULL')
      .select('sg.id')
      .getMany();
    return entities.map((e) => e.id);
  }

  async findByIds(ids: number[]): Promise<SteamGame[]> {
    if (!ids.length) return [];
    return this.repository
      .createQueryBuilder('sg')
      .where('sg.id IN (:...ids)', { ids })
      .getMany();
  }

  async upsertMany(games: SteamOwnedGame[]): Promise<void> {
    if (!games.length) return;

    await this.repository
      .createQueryBuilder()
      .insert()
      .into(SteamGame)
      .values(
        games.map((g) => ({
          id: g.appid,
          name: g.name,
          iconHash: g.img_icon_url || null,
        })),
      )
      .orUpdate(['name', 'icon_hash'], ['id'])
      .execute();
  }

  async updateWithDetails(
    appId: number,
    details: SteamAppDetails,
  ): Promise<void> {
    const releasedAt = details.release_date?.date
      ? (() => {
          const d = new Date(details.release_date.date);
          return isNaN(d.getTime()) ? null : d;
        })()
      : null;

    const price = details.is_free
      ? 'Free'
      : (details.price_overview?.final_formatted ?? null);

    await this.repository.update(
      { id: appId },
      {
        imageUrl: details.header_image ?? null,
        description: details.short_description ?? null,
        price,
        platformWindows: details.platforms.windows,
        platformMac: details.platforms.mac,
        platformLinux: details.platforms.linux,
        metacriticScore: details.metacritic?.score ?? null,
        metacriticUrl: details.metacritic?.url ?? null,
        categories: details.categories?.map((c) => c.description) ?? [],
        genres: details.genres?.map((g) => g.description) ?? [],
        screenshots: details.screenshots?.map((s) => s.path_full) ?? [],
        achievementsCount: details.achievements?.total ?? null,
        releasedAt,
        developers: details.developers ?? [],
        publishers: details.publishers ?? [],
      },
    );
  }

}
