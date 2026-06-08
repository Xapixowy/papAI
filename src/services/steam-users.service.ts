import { SteamUser } from '@Database/entities/steam-user.entity';
import { SteamUserDto } from '@DTOs/steam-user.dto';
import { ErrorCode } from '@Enums/error-code.enum';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { err, ok, Result } from 'neverthrow';
import { Repository } from 'typeorm';

@Injectable()
export class SteamUsersService {
  constructor(
    @InjectRepository(SteamUser)
    private readonly repository: Repository<SteamUser>,
  ) {}

  async findById(id: string): Promise<Result<SteamUser, ErrorCode>> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? ok(entity) : err(ErrorCode.STEAM_USER_NOT_FOUND);
  }

  async findByIds(ids: string[]): Promise<SteamUser[]> {
    if (!ids.length) return [];
    return this.repository
      .createQueryBuilder('su')
      .where('su.id IN (:...ids)', { ids })
      .getMany();
  }

  async upsert(dto: SteamUserDto): Promise<Result<SteamUser, ErrorCode>> {
    const existing = await this.repository.findOne({ where: { id: dto.id } });

    if (existing) {
      const updated = await this.repository.save({
        ...existing,
        username: dto.username,
        avatarUrl: dto.avatarUrl,
        profileUrl: dto.profileUrl,
      });
      return ok(updated);
    }

    const created = this.repository.create({
      id: dto.id,
      username: dto.username,
      avatarUrl: dto.avatarUrl,
      profileUrl: dto.profileUrl,
    });

    const saved = await this.repository.save(created);
    return ok(saved);
  }
}
