import { DiscordSteamObserver } from '@Database/entities/discord-steam-observer.entity';
import { DiscordSteamObserverDto } from '@DTOs/discord-steam-observer.dto';
import { ErrorCode } from '@Enums/error-code.enum';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { err, ok, Result } from 'neverthrow';
import { Repository } from 'typeorm';

@Injectable()
export class DiscordSteamObserversService {
  constructor(
    @InjectRepository(DiscordSteamObserver)
    private readonly repository: Repository<DiscordSteamObserver>,
  ) {}

  async findAll(): Promise<DiscordSteamObserver[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<Result<DiscordSteamObserver, ErrorCode>> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? ok(entity) : err(ErrorCode.STEAM_OBSERVER_NOT_FOUND);
  }

  async findByGuildId(discordGuildId: string): Promise<DiscordSteamObserver[]> {
    return this.repository.find({ where: { discordGuildId } });
  }

  async findByDiscordUserId(
    discordUserId: string,
  ): Promise<DiscordSteamObserver[]> {
    return this.repository.find({ where: { discordUserId } });
  }

  async findBySteamUserId(
    steamUserId: string,
  ): Promise<DiscordSteamObserver[]> {
    return this.repository.find({ where: { steamUserId } });
  }

  async create(
    dto: DiscordSteamObserverDto,
  ): Promise<Result<DiscordSteamObserver, ErrorCode>> {
    const existing = await this.repository.findOne({
      where: {
        discordChannelId: dto.discordChannelId,
        steamUserId: dto.steamUserId,
      },
    });

    if (existing) {
      return err(ErrorCode.STEAM_OBSERVER_EXISTS);
    }

    const entity = this.repository.create({
      discordUserId: dto.discordUserId,
      discordGuildId: dto.discordGuildId,
      discordChannelId: dto.discordChannelId,
      steamUserId: dto.steamUserId,
    });

    const saved = await this.repository.save(entity);
    return ok(saved);
  }

  async deleteById(id: string): Promise<Result<void, ErrorCode>> {
    const result = await this.repository.delete({ id });
    return result.affected && result.affected > 0
      ? ok(undefined)
      : err(ErrorCode.STEAM_OBSERVER_NOT_FOUND);
  }
}
