import { DiscordSetting } from '@Database/entities/discord-setting.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiscordSettingsService } from '@Services/discord-settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([DiscordSetting])],
  providers: [DiscordSettingsService],
  exports: [DiscordSettingsService],
})
export class DiscordSettingsModule {}
