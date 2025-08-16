import { DiscordUser } from '@Database/entities/discord-user.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiscordUserService } from '@Services/discord-user.service';

@Module({
  imports: [TypeOrmModule.forFeature([DiscordUser])],
  providers: [DiscordUserService],
  exports: [DiscordUserService],
})
export class DiscordUserModule {}
