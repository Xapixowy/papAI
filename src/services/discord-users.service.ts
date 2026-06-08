import { DiscordUser } from '@Database/entities/discord-user.entity';
import { DiscordUserDto } from '@DTOs/discord-user.dto';
import { DiscordUserRole } from '@Enums/discord/discord-user-role.enum';
import { ErrorCode } from '@Enums/error-code.enum';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { err, ok, Result } from 'neverthrow';
import { Repository } from 'typeorm';

@Injectable()
export class DiscordUsersService {
  constructor(
    @InjectRepository(DiscordUser)
    private readonly repository: Repository<DiscordUser>,
  ) {}

  async findById(id: string): Promise<Result<DiscordUser, ErrorCode>> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? ok(entity) : err(ErrorCode.DISCORD_USER_NOT_FOUND);
  }

  async findByUserId(userId: string): Promise<Result<DiscordUser, ErrorCode>> {
    const entity = await this.repository.findOne({ where: { id: userId } });
    return entity ? ok(entity) : err(ErrorCode.DISCORD_USER_NOT_FOUND);
  }

  async findByUserIds(userIds: string[]): Promise<DiscordUser[]> {
    if (!userIds.length) return [];
    return this.repository
      .createQueryBuilder('u')
      .where('u.id IN (:...ids)', { ids: userIds })
      .getMany();
  }

  async findAll(): Promise<Result<DiscordUser[], ErrorCode>> {
    const entities = await this.repository.find();
    return entities.length > 0
      ? ok(entities)
      : err(ErrorCode.DISCORD_USER_NOT_FOUND);
  }

  async findAllByRoles(
    roles: DiscordUserRole[],
  ): Promise<Result<DiscordUser[], ErrorCode>> {
    const entities = await this.repository
      .createQueryBuilder('u')
      .where('u.roles && ARRAY[:...roles]::discord_user_role[]', { roles })
      .getMany();

    return entities.length > 0
      ? ok(entities)
      : err(ErrorCode.DISCORD_USER_NOT_FOUND);
  }

  async create(dto: DiscordUserDto): Promise<Result<DiscordUser, ErrorCode>> {
    const existing = await this.repository.findOne({
      where: { id: dto.id },
    });
    if (existing) {
      return err(ErrorCode.DISCORD_USER_EXISTS);
    }

    const entity = this.repository.create({
      id: dto.id,
      username: dto.username,
      roles: dto.roles,
    });

    const saved = await this.repository.save(entity);
    return ok(saved);
  }

  async update(dto: DiscordUserDto): Promise<Result<DiscordUser, ErrorCode>> {
    if (!dto.id) {
      return err(ErrorCode.DISCORD_USER_NOT_FOUND);
    }

    const entity = await this.repository.findOne({ where: { id: dto.id } });

    if (!entity) {
      return err(ErrorCode.DISCORD_USER_NOT_FOUND);
    }

    const updated = await this.repository.save({
      ...entity,
      username: dto.username,
      roles: dto.roles,
    });

    return ok(updated);
  }

  async deleteById(id: string): Promise<Result<void, ErrorCode>> {
    const result = await this.repository.delete({ id });
    return result.affected && result.affected > 0
      ? ok(undefined)
      : err(ErrorCode.DISCORD_USER_NOT_FOUND);
  }

  async deleteByUserId(userId: string): Promise<Result<void, ErrorCode>> {
    const result = await this.repository.delete({ id: userId });
    return result.affected && result.affected > 0
      ? ok(undefined)
      : err(ErrorCode.DISCORD_USER_NOT_FOUND);
  }
}
