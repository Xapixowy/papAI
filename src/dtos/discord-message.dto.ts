import { DiscordMessage } from '@Database/entities/discord-message.entity';

export class DiscordMessageDto {
  id?: string;
  message: string;
  attachments?: string[];
  discordUserId: string;
  discordChannelId: string;
  discordServerId: string;
  createdAt: Date;

  constructor({
    id,
    message,
    attachments,
    discordUserId,
    discordChannelId,
    discordServerId,
    createdAt,
  }: {
    id?: string;
    message: string;
    attachments?: string[];
    discordUserId: string;
    discordChannelId: string;
    discordServerId: string;
    createdAt: Date;
  }) {
    this.id = id;
    this.message = message;
    this.attachments = attachments;
    this.discordUserId = discordUserId;
    this.discordChannelId = discordChannelId;
    this.discordServerId = discordServerId;
    this.createdAt = createdAt;
  }

  static fromEntity(entity: DiscordMessage): DiscordMessageDto {
    return new DiscordMessageDto({
      id: entity.id,
      message: entity.message,
      attachments: entity.attachments,
      discordUserId: entity.discordUserId,
      discordChannelId: entity.discordChannelId,
      discordServerId: entity.discordServerId,
      createdAt: entity.createdAt,
    });
  }
}
