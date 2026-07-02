import { FitCoachUserSettings } from '@Entities/fit-coach-user-settings.entity';
import { MealTimeRanges } from '@Types/fit-coach/meal-time-ranges.type';

export class FitCoachUserSettingsDto {
  id?: string;
  discordUserId: string;
  timezone: string;
  mealTimeRanges: MealTimeRanges;
  isOnboarded: boolean;
  createdAt?: Date;
  updatedAt?: Date;

  constructor(data: FitCoachUserSettingsDto) {
    Object.assign(this, data);
  }

  static fromEntity(entity: FitCoachUserSettings): FitCoachUserSettingsDto {
    return new FitCoachUserSettingsDto({
      id: entity.id,
      discordUserId: entity.discordUserId,
      timezone: entity.timezone,
      mealTimeRanges: entity.mealTimeRanges,
      isOnboarded: entity.isOnboarded,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }
}
