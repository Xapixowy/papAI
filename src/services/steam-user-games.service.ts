import { SteamUserGame } from '@Database/entities/steam-user-game.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class SteamUserGamesService {
  constructor(
    @InjectRepository(SteamUserGame)
    private readonly repository: Repository<SteamUserGame>,
  ) {}

  async findGameIdsBySteamUserId(steamUserId: string): Promise<number[]> {
    const entities = await this.repository.find({
      where: { steamUserId },
      select: ['steamGameId'],
    });
    return entities.map((e) => e.steamGameId);
  }

  async findAllGameIdsByUserIds(steamUserIds: string[]): Promise<number[]> {
    if (!steamUserIds.length) return [];
    const entities = await this.repository
      .createQueryBuilder('sug')
      .where('sug.steam_user_id IN (:...ids)', { ids: steamUserIds })
      .select('sug.steamGameId')
      .getMany();
    return [...new Set(entities.map((e) => e.steamGameId))];
  }

  async createMany(steamUserId: string, gameIds: number[]): Promise<void> {
    if (!gameIds.length) return;

    await this.repository
      .createQueryBuilder()
      .insert()
      .into(SteamUserGame)
      .values(gameIds.map((steamGameId) => ({ steamUserId, steamGameId })))
      .orIgnore()
      .execute();
  }
}
