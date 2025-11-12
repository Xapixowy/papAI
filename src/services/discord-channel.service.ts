import { DiscordChannel } from '@Database/entities/discord-channel.entity';
import { DiscordChannelDto } from '@DTOs/discord-channel.dto';
import { DiscordChannelFeature } from '@Enums/discord/discord-channel-feature.enum';
import { ErrorCode } from '@Enums/error-code.enum';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { err, ok, Result } from 'neverthrow';
import { Repository } from 'typeorm';

@Injectable()
export class DiscordChannelService {
  constructor(
    @InjectRepository(DiscordChannel)
    private readonly repository: Repository<DiscordChannel>,
  ) {}

  async findAll(): Promise<DiscordChannel[]> {
    return this.repository.find();
  }

  async findAllByGuildId(
    guildId: string,
  ): Promise<Result<DiscordChannel[], ErrorCode>> {
    const entities = await this.repository.find({
      where: { discordGuildId: guildId },
    });

    return entities.length > 0
      ? ok(entities)
      : err(ErrorCode.DISCORD_CHANNEL_NOT_FOUND);
  }

  async findById(id: string): Promise<Result<DiscordChannel, ErrorCode>> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? ok(entity) : err(ErrorCode.DISCORD_CHANNEL_NOT_FOUND);
  }

  async create(
    dto: DiscordChannelDto,
  ): Promise<Result<DiscordChannel, ErrorCode>> {
    const existing = await this.repository.findOne({
      where: { id: dto.id },
    });

    if (existing) {
      return err(ErrorCode.DISCORD_CHANNEL_EXISTS);
    }

    const newChannel = this.repository.create({
      id: dto.id,
      name: dto.name,
      discordGuildId: dto.discordGuildId,
      features: dto.features,
    });

    const savedChannel = await this.repository.save(newChannel);
    return ok(savedChannel);
  }

  async update(
    dto: DiscordChannelDto,
  ): Promise<Result<DiscordChannel, ErrorCode>> {
    if (!dto.id) {
      return err(ErrorCode.DISCORD_CHANNEL_NOT_FOUND);
    }

    const channelToUpdate = await this.repository.findOne({
      where: { id: dto.id },
    });

    if (!channelToUpdate) {
      return err(ErrorCode.DISCORD_CHANNEL_NOT_FOUND);
    }

    const updatedChannel = await this.repository.save({
      ...channelToUpdate,
      discordGuildId: dto.discordGuildId,
      features: dto.features,
    });

    return ok(updatedChannel);
  }

  async deleteById(id: string): Promise<Result<void, ErrorCode>> {
    const result = await this.repository.delete({ id });
    return result.affected && result.affected > 0
      ? ok(undefined)
      : err(ErrorCode.DISCORD_CHANNEL_NOT_FOUND);
  }

  async isFeatureEnabled({
    channelId,
    feature,
  }: {
    channelId: string;
    feature: DiscordChannelFeature;
  }): Promise<Result<boolean, ErrorCode>> {
    const config = await this.findById(channelId);

    if (config.isErr()) {
      return err(ErrorCode.DISCORD_CHANNEL_NOT_FOUND);
    }
    const configValue = config.value;

    return ok(configValue.features[feature]);
  }
}
