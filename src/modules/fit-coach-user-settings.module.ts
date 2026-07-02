import { FitCoachUserSettings } from '@Entities/fit-coach-user-settings.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FitCoachUserSettingsService } from '@Services/fit-coach-user-settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([FitCoachUserSettings])],
  providers: [FitCoachUserSettingsService],
  exports: [FitCoachUserSettingsService],
})
export class FitCoachUserSettingsModule {}
