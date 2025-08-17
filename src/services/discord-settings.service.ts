import { DiscordSetting } from '@Database/entities/discord-setting.entity';
import { DiscordSettingKey } from '@Enums/discord-setting-key.enum';
import { DiscordSettingType } from '@Enums/discord-setting-type.enum';
import { ErrorCode } from '@Enums/error-code.enum';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { err, ok, Result } from 'neverthrow';
import { Repository } from 'typeorm';

@Injectable()
export class DiscordSettingsService {
  constructor(
    @InjectRepository(DiscordSetting)
    private readonly repository: Repository<DiscordSetting>,
  ) {}

  async findById(id: string): Promise<Result<DiscordSetting, ErrorCode>> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? ok(entity) : err(ErrorCode.DISCORD_SETTING_NOT_FOUND);
  }

  async findByKey(
    key: DiscordSettingKey,
  ): Promise<Result<DiscordSetting, ErrorCode>> {
    const entity = await this.repository.findOne({ where: { key } });
    return entity ? ok(entity) : err(ErrorCode.DISCORD_SETTING_NOT_FOUND);
  }

  async getValueByKey<T = unknown>(
    key: DiscordSettingKey,
  ): Promise<Result<T, ErrorCode>> {
    const res = await this.findByKey(key);
    return res.map((s) => s.value as T);
  }

  async create(
    key: DiscordSettingKey,
    value: unknown,
    type: DiscordSettingType = this.detectType(value),
  ): Promise<Result<DiscordSetting, ErrorCode>> {
    const existingSetting = await this.findByKey(key);

    if (existingSetting.isOk()) {
      return err(ErrorCode.DISCORD_SETTING_EXISTS);
    }

    const newSetting = this.repository.create({
      key,
      type,
      value,
    });

    const savedSetting = await this.repository.save(newSetting);
    return ok(savedSetting);
  }

  async update(
    key: DiscordSettingKey,
    value: unknown,
    type: DiscordSettingType = this.detectType(value),
  ): Promise<Result<DiscordSetting, ErrorCode>> {
    const existingSetting = await this.findByKey(key);

    if (existingSetting.isErr()) {
      return existingSetting;
    }

    const settingToUpdate = existingSetting.value;
    settingToUpdate.value = value;
    settingToUpdate.type = type;

    const updatedSetting = await this.repository.save(settingToUpdate);
    return ok(updatedSetting);
  }

  async deleteById(id: string): Promise<Result<void, ErrorCode>> {
    const result = await this.repository.delete({ id });
    return result.affected && result.affected > 0
      ? ok(undefined)
      : err(ErrorCode.DISCORD_SETTING_NOT_FOUND);
  }

  async deleteByKey(key: DiscordSettingKey): Promise<Result<void, ErrorCode>> {
    const result = await this.repository.delete({ key });
    return result.affected && result.affected > 0
      ? ok(undefined)
      : err(ErrorCode.DISCORD_SETTING_NOT_FOUND);
  }

  async set(
    key: DiscordSettingKey,
    value: unknown,
    type: DiscordSettingType = this.detectType(value),
  ): Promise<Result<DiscordSetting, ErrorCode>> {
    const newSetting = await this.create(key, value, type);

    if (newSetting.isOk()) {
      return newSetting;
    }

    return await this.update(key, value, type);
  }

  private detectType(value: unknown): DiscordSettingType {
    if (Array.isArray(value)) return DiscordSettingType.ARRAY;
    switch (typeof value) {
      case 'string':
        return DiscordSettingType.STRING;
      case 'number':
        return DiscordSettingType.NUMBER;
      case 'boolean':
        return DiscordSettingType.BOOLEAN;
      default:
        return DiscordSettingType.JSON;
    }
  }
}
