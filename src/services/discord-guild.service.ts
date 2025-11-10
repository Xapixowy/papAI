import { DiscordGuild } from '@Database/entities/discord-guild.entity';
import { DiscordGuildDto } from '@DTOs/discord-guild.dto';
import { DiscordFeature } from '@Enums/discord/discord-feature.enum';
import { ErrorCode } from '@Enums/error-code.enum';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { err, ok, Result } from 'neverthrow';
import { Repository } from 'typeorm';

@Injectable()
export class DiscordGuildService {
  constructor(
    @InjectRepository(DiscordGuild)
    private readonly repository: Repository<DiscordGuild>,
  ) {}

  async findAll(): Promise<DiscordGuild[]> {
    return await this.repository.find();
  }

  async findById(id: string): Promise<Result<DiscordGuild, ErrorCode>> {
    const entity = await this.repository.findOne({ where: { id } });

    return entity ? ok(entity) : err(ErrorCode.DISCORD_GUILD_NOT_FOUND);
  }

  async create(dto: DiscordGuildDto): Promise<Result<DiscordGuild, ErrorCode>> {
    const dtoId = dto.id;

    if (!dtoId) {
      return err(ErrorCode.DISCORD_GUILD_UNABLE_TO_CREATE);
    }

    const existing = await this.repository.findOne({
      where: { id: dtoId },
    });

    if (existing) {
      return err(ErrorCode.DISCORD_GUILD_EXISTS);
    }

    const newConfig = this.repository.create(dto);
    const savedConfig = await this.repository.save(newConfig);

    return ok(savedConfig);
  }

  async update(dto: DiscordGuildDto): Promise<Result<DiscordGuild, ErrorCode>> {
    const dtoId = dto.id;

    if (!dtoId) {
      return err(ErrorCode.DISCORD_GUILD_UNABLE_TO_UPDATE);
    }

    const existingConfig = await this.findById(dtoId);

    if (existingConfig.isErr()) {
      return err(ErrorCode.DISCORD_GUILD_NOT_FOUND);
    }

    const configToUpdate = existingConfig.value;
    configToUpdate.name = dto.name;
    configToUpdate.features = dto.features;

    const updatedConfig = await this.repository.save(configToUpdate);

    return ok(updatedConfig);
  }

  async deleteById(id: string): Promise<Result<void, ErrorCode>> {
    const result = await this.repository.delete({ id });

    return result.affected && result.affected > 0
      ? ok(undefined)
      : err(ErrorCode.DISCORD_GUILD_NOT_FOUND);
  }

  async isFeatureEnabled({
    guildId,
    feature,
  }: {
    guildId: string;
    feature: DiscordFeature;
  }): Promise<Result<boolean, ErrorCode>> {
    const config = await this.findById(guildId);

    if (config.isErr()) {
      return err(ErrorCode.DISCORD_GUILD_NOT_FOUND);
    }
    const configValue = config.value;

    return ok(configValue.features.includes(feature));
  }
}
