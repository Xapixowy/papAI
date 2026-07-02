import { FitCoachUserSettings } from '@Entities/fit-coach-user-settings.entity';
import { FitCoachUserSettingsDto } from '@DTOs/fit-coach-user-settings.dto';
import { ErrorCode } from '@Enums/error-code.enum';
import { MealTimeRanges } from '@Types/fit-coach/meal-time-ranges.type';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { err, ok, Result } from 'neverthrow';
import { Repository } from 'typeorm';
import { DEFAULT_MEAL_TIME_RANGES } from '@Constants/fit-coach/meal-time-ranges.constant';
import { REGEX_IANA_TIMEZONE } from '@Constants/regex.constant';

@Injectable()
export class FitCoachUserSettingsService {
  constructor(
    @InjectRepository(FitCoachUserSettings)
    private readonly settingsRepository: Repository<FitCoachUserSettings>,
  ) {}

  async findByUserId(
    discordUserId: string,
  ): Promise<Result<FitCoachUserSettings, ErrorCode>> {
    const entity = await this.settingsRepository.findOne({
      where: { discordUserId },
    });
    return entity
      ? ok(entity)
      : err(ErrorCode.FIT_COACH_USER_SETTINGS_NOT_FOUND);
  }

  async createWithDefaults(
    discordUserId: string,
    timezone = 'UTC',
    isOnboarded = false,
  ): Promise<FitCoachUserSettings> {
    const entity = this.settingsRepository.create({
      discordUserId,
      timezone,
      mealTimeRanges: DEFAULT_MEAL_TIME_RANGES,
      isOnboarded,
    });
    return this.settingsRepository.save(entity);
  }

  async update(
    dto: FitCoachUserSettingsDto,
  ): Promise<Result<FitCoachUserSettings, ErrorCode>> {
    const existing = await this.settingsRepository.findOne({
      where: { discordUserId: dto.discordUserId },
    });

    if (!existing) {
      return err(ErrorCode.FIT_COACH_USER_SETTINGS_NOT_FOUND);
    }

    const updated = await this.settingsRepository.save({
      ...existing,
      timezone: dto.timezone ?? existing.timezone,
      mealTimeRanges: dto.mealTimeRanges ?? existing.mealTimeRanges,
      isOnboarded: dto.isOnboarded ?? existing.isOnboarded,
    });

    return ok(updated);
  }

  async setOnboarded(
    discordUserId: string,
    timezone: string,
    mealTimeRanges: MealTimeRanges,
  ): Promise<Result<FitCoachUserSettings, ErrorCode>> {
    const existing = await this.settingsRepository.findOne({
      where: { discordUserId },
    });

    if (!existing) {
      return err(ErrorCode.FIT_COACH_USER_SETTINGS_NOT_FOUND);
    }

    const updated = await this.settingsRepository.save({
      ...existing,
      timezone,
      mealTimeRanges,
      isOnboarded: true,
    });

    return ok(updated);
  }

  isValidTimezone(timezone: string): boolean {
    if (!REGEX_IANA_TIMEZONE.test(timezone)) return false;
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  }
}
