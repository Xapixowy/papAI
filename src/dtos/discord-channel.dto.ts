import { DiscordChannel } from '@Database/entities/discord-channel.entity';
import { DiscordChannelFeature } from '@Enums/discord/discord-channel-feature.enum';

export class DiscordChannelDto {
  id?: string;
  name: string;
  discordGuildId: string;
  features: Record<DiscordChannelFeature, boolean>;

  constructor({
    id,
    name,
    discordGuildId,
    features,
  }: {
    id?: string;
    name: string;
    discordGuildId: string;
    features: Record<DiscordChannelFeature, boolean>;
  }) {
    this.id = id;
    this.name = name;
    this.discordGuildId = discordGuildId;
    this.features = features;
  }

  static fromEntity(entity: DiscordChannel): DiscordChannelDto {
    return new DiscordChannelDto({
      id: entity.id,
      name: entity.name,
      discordGuildId: entity.discordGuildId,
      features: entity.features,
    });
  }
}
