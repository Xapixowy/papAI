import { DiscordUser } from '@Database/entities/discord-user.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiscordUsersService } from '@Services/discord-users.service';

@Module({
  imports: [TypeOrmModule.forFeature([DiscordUser])],
  providers: [DiscordUsersService],
  exports: [DiscordUsersService],
})
export class DiscordUsersModule {}
