import { DiscordGuild } from '@Database/entities/discord-guild.entity';
import { DiscordChannelFeature } from '@Enums/discord/discord-channel-feature.enum';
import { DiscordFeature } from '@Enums/discord/discord-feature.enum';

export class DiscordGuildDto {
  id?: string;
  name: string;
  features: DiscordFeature[];
  channelFeatureDefaults: Record<DiscordChannelFeature, boolean>;
  createdAt: Date;
  updatedAt: Date;

  constructor({
    id,
    name,
    features,
    channelFeatureDefaults,
    createdAt,
    updatedAt,
  }: {
    id?: string;
    name: string;
    features: DiscordFeature[];
    channelFeatureDefaults: Record<DiscordChannelFeature, boolean>;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = id;
    this.name = name;
    this.features = features;
    this.channelFeatureDefaults = channelFeatureDefaults;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
  static fromEntity(entity: DiscordGuild): DiscordGuildDto {
    return new DiscordGuildDto({
      id: entity.id,
      name: entity.name,
      features: entity.features,
      channelFeatureDefaults: entity.channelFeatureDefaults,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }
}
