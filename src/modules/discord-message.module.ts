import { DiscordMessage } from '@Database/entities/discord-message.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiscordMessageService } from '@Services/discord-message.service';

@Module({
  imports: [TypeOrmModule.forFeature([DiscordMessage])],
  providers: [DiscordMessageService],
  exports: [DiscordMessageService],
})
export class DiscordMessageModule {}
