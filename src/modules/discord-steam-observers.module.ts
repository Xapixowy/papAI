import { DiscordSteamObserver } from '@Database/entities/discord-steam-observer.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiscordSteamObserversService } from '@Services/discord-steam-observers.service';

@Module({
  imports: [TypeOrmModule.forFeature([DiscordSteamObserver])],
  providers: [DiscordSteamObserversService],
  exports: [DiscordSteamObserversService],
})
export class DiscordSteamObserversModule {}
