import { SteamUser } from '@Database/entities/steam-user.entity';

export class SteamUserDto {
  id: string;
  username: string;
  avatarUrl: string | null;
  profileUrl: string | null;
  createdAt?: Date;
  updatedAt?: Date;

  constructor({
    id,
    username,
    avatarUrl,
    profileUrl,
    createdAt,
    updatedAt,
  }: SteamUserDto) {
    this.id = id;
    this.username = username;
    this.avatarUrl = avatarUrl;
    this.profileUrl = profileUrl;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static fromEntity(entity: SteamUser): SteamUserDto {
    return new SteamUserDto({
      id: entity.id,
      username: entity.username,
      avatarUrl: entity.avatarUrl,
      profileUrl: entity.profileUrl,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }
}
