import { DiscordFeature } from '@Enums/discord-feature.enum';

export class DiscordGuildConfigDto {
  id?: string;
  name: string;
  features: DiscordFeature[];
  createdAt: Date;
  updatedAt: Date;

  constructor({
    id,
    name,
    features,
    createdAt,
    updatedAt,
  }: {
    id?: string;
    name: string;
    features: DiscordFeature[];
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = id;
    this.name = name;
    this.features = features;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
  static fromEntity(entity: DiscordGuildConfigDto): DiscordGuildConfigDto {
    return new DiscordGuildConfigDto({
      id: entity.id,
      name: entity.name,
      features: entity.features,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }
}
