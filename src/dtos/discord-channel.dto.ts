import { DiscordChannel } from '@Database/entities/discord-channel.entity';
import { DiscordChannelFeature } from '@Enums/discord/discord-channel-feature.enum';
import { DiscordMessageDto } from './discord-message.dto';

export class DiscordChannelDto {
  id?: string;
  discordGuildId: string;
  features: Record<DiscordChannelFeature, boolean>;
  messages?: DiscordMessageDto[];

  constructor({
    id,
    discordGuildId,
    features,
    messages,
  }: {
    id?: string;
    discordGuildId: string;
    features: Record<DiscordChannelFeature, boolean>;
    messages?: DiscordMessageDto[];
  }) {
    this.id = id;
    this.discordGuildId = discordGuildId;
    this.features = features;
    this.messages = messages;
  }

  static fromEntity(entity: DiscordChannel): DiscordChannelDto {
    return new DiscordChannelDto({
      id: entity.id,
      discordGuildId: entity.discordGuildId,
      features: entity.features,
      messages: entity.messages?.map((m) => DiscordMessageDto.fromEntity(m)),
    });
  }
}
