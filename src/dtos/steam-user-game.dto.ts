import { SteamUserGame } from '@Database/entities/steam-user-game.entity';

export class SteamUserGameDto {
  id?: string;
  steamUserId: string;
  steamGameId: number;
  createdAt?: Date;

  constructor({ id, steamUserId, steamGameId, createdAt }: SteamUserGameDto) {
    this.id = id;
    this.steamUserId = steamUserId;
    this.steamGameId = steamGameId;
    this.createdAt = createdAt;
  }

  static fromEntity(entity: SteamUserGame): SteamUserGameDto {
    return new SteamUserGameDto({
      id: entity.id,
      steamUserId: entity.steamUserId,
      steamGameId: entity.steamGameId,
      createdAt: entity.createdAt,
    });
  }
}
