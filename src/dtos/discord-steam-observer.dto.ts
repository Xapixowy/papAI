import { DiscordSteamObserver } from '@Database/entities/discord-steam-observer.entity';

export class DiscordSteamObserverDto {
  id?: string;
  discordUserId: string;
  discordGuildId: string;
  discordChannelId: string;
  steamUserId: string;
  createdAt?: Date;

  constructor({
    id,
    discordUserId,
    discordGuildId,
    discordChannelId,
    steamUserId,
    createdAt,
  }: DiscordSteamObserverDto) {
    this.id = id;
    this.discordUserId = discordUserId;
    this.discordGuildId = discordGuildId;
    this.discordChannelId = discordChannelId;
    this.steamUserId = steamUserId;
    this.createdAt = createdAt;
  }

  static fromEntity(entity: DiscordSteamObserver): DiscordSteamObserverDto {
    return new DiscordSteamObserverDto({
      id: entity.id,
      discordUserId: entity.discordUserId,
      discordGuildId: entity.discordGuildId,
      discordChannelId: entity.discordChannelId,
      steamUserId: entity.steamUserId,
      createdAt: entity.createdAt,
    });
  }
}
