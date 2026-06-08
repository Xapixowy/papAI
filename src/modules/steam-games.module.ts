import { SteamGame } from '@Database/entities/steam-game.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SteamGamesService } from '@Services/steam-games.service';

@Module({
  imports: [TypeOrmModule.forFeature([SteamGame])],
  providers: [SteamGamesService],
  exports: [SteamGamesService],
})
export class SteamGamesModule {}
