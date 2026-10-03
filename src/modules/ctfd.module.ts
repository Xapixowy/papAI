import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DiscordSettingsModule } from './discord-settings.module';
import { CtfdService } from '@Services/ctfd.service';
import { RedisModule } from './redis.module';

@Module({
  imports: [ScheduleModule.forRoot(), DiscordSettingsModule, RedisModule],
  providers: [CtfdService],
  exports: [CtfdService],
})
export class CtfdModule {}
