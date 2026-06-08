import { SteamGame } from '@Database/entities/steam-game.entity';

export class SteamGameDto {
  id: number;
  name: string;
  iconHash: string | null;
  createdAt?: Date;

  constructor({
    id,
    name,
    iconHash,
    createdAt,
  }: {
    id: number;
    name: string;
    iconHash: string | null;
    createdAt?: Date;
  }) {
    this.id = id;
    this.name = name;
    this.iconHash = iconHash;
    this.createdAt = createdAt;
  }

  static fromEntity(entity: SteamGame): SteamGameDto {
    return new SteamGameDto({
      id: entity.id,
      name: entity.name,
      iconHash: entity.iconHash,
      createdAt: entity.createdAt,
    });
  }

  get iconUrl(): string | null {
    if (!this.iconHash) return null;
    return `https://media.steampowered.com/steamcommunity/public/images/apps/${this.id}/${this.iconHash}.jpg`;
  }
}
