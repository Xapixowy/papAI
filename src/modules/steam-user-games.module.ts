import { SteamUserGame } from '@Database/entities/steam-user-game.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SteamUserGamesService } from '@Services/steam-user-games.service';

@Module({
  imports: [TypeOrmModule.forFeature([SteamUserGame])],
  providers: [SteamUserGamesService],
  exports: [SteamUserGamesService],
})
export class SteamUserGamesModule {}
