import { DiscordChannel } from '@Database/entities/discord-channel.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiscordChannelService } from '@Services/discord-channel.service';

@Module({
  imports: [TypeOrmModule.forFeature([DiscordChannel])],
  providers: [DiscordChannelService],
  exports: [DiscordChannelService],
})
export class DiscordChannelModule {}
