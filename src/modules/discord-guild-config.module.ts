import { DiscordGuildConfig } from '@Database/entities/discord-guild-config.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiscordGuildConfigService } from '@Services/discord-guild-config.service';

@Module({
  imports: [TypeOrmModule.forFeature([DiscordGuildConfig])],
  providers: [DiscordGuildConfigService],
  exports: [DiscordGuildConfigService],
})
export class DiscordGuildConfigModule {}
