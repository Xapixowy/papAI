import { DiscordUser } from '@Database/entities/discord-user.entity';
import { DiscordUserRole } from '@Enums/discord-user-role.enum';

export class DiscordUserDto {
  id?: string;
  userId: string;
  username: string;
  roles: DiscordUserRole[];
  createdAt?: Date;
  updatedAt?: Date;

  constructor({
    id,
    userId,
    username,
    roles,
    createdAt,
    updatedAt,
  }: {
    id?: string;
    userId: string;
    username: string;
    roles: DiscordUserRole[];
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = id;
    this.userId = userId;
    this.username = username;
    this.roles = roles;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static fromEntity(entity: DiscordUser): DiscordUserDto {
    return new DiscordUserDto({
      id: entity.id,
      userId: entity.userId,
      username: entity.username,
      roles: entity.roles,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }
}
