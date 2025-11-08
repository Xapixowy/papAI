import { DiscordGuildConfig } from '@Database/entities/discord-guild-config.entity';
import { DiscordGuildConfigDto } from '@DTOs/discord-guild-config.dto';
import { DiscordFeature } from '@Enums/discord-feature.enum';
import { ErrorCode } from '@Enums/error-code.enum';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { err, ok, Result } from 'neverthrow';
import { Repository } from 'typeorm';

@Injectable()
export class DiscordGuildConfigService {
  constructor(
    @InjectRepository(DiscordGuildConfig)
    private readonly repository: Repository<DiscordGuildConfig>,
  ) {}

  async findAll(): Promise<DiscordGuildConfig[]> {
    return await this.repository.find();
  }

  async findById({
    id,
  }: {
    id: string;
  }): Promise<Result<DiscordGuildConfig, ErrorCode>> {
    const entity = await this.repository.findOne({ where: { id } });

    return entity ? ok(entity) : err(ErrorCode.DISCORD_GUILD_CONFIG_NOT_FOUND);
  }

  async create({
    dto,
  }: {
    dto: DiscordGuildConfig;
  }): Promise<Result<DiscordGuildConfig, ErrorCode>> {
    try {
      const newConfig = this.repository.create(dto);
      const savedConfig = await this.repository.save(newConfig);

      return ok(savedConfig);
    } catch {
      return err(ErrorCode.DISCORD_GUILD_CONFIG_UNABLE_TO_CREATE);
    }
  }

  async update({
    dto,
  }: {
    dto: DiscordGuildConfigDto;
  }): Promise<Result<DiscordGuildConfig, ErrorCode>> {
    try {
      if (!dto.id) {
        return err(ErrorCode.DISCORD_GUILD_CONFIG_NOT_FOUND);
      }

      const existingConfig = await this.findById({
        id: dto.id,
      });

      if (existingConfig.isErr()) {
        return err(ErrorCode.DISCORD_GUILD_CONFIG_NOT_FOUND);
      }

      const configToUpdate = existingConfig.value;
      configToUpdate.name = dto.name;
      configToUpdate.features = dto.features;

      const updatedConfig = await this.repository.save(configToUpdate);

      return ok(updatedConfig);
    } catch {
      return err(ErrorCode.DISCORD_GUILD_CONFIG_UNABLE_TO_UPDATE);
    }
  }

  async deleteById({ id }: { id: string }): Promise<Result<void, ErrorCode>> {
    const result = await this.repository.delete({ id });

    return result.affected && result.affected > 0
      ? ok(undefined)
      : err(ErrorCode.DISCORD_GUILD_CONFIG_NOT_FOUND);
  }

  async isFeatureEnabled({
    guildId,
    feature,
  }: {
    guildId: string;
    feature: DiscordFeature;
  }): Promise<Result<boolean, ErrorCode>> {
    const config = await this.findById({
      id: guildId,
    });

    if (config.isErr()) {
      return err(ErrorCode.DISCORD_GUILD_CONFIG_NOT_FOUND);
    }
    const configValue = config.value;

    return ok(configValue.features.includes(feature));
  }
}
