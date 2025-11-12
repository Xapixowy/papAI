import { DiscordGuild } from '@Database/entities/discord-guild.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiscordGuildService } from '@Services/discord-guild.service';

@Module({
  imports: [TypeOrmModule.forFeature([DiscordGuild])],
  providers: [DiscordGuildService],
  exports: [DiscordGuildService],
})
export class DiscordGuildModule {}
