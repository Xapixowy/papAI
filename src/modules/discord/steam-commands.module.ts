import { SteamObserverCommandsController } from '@Controllers/discord/steam/steam-observer-commands.controller';
import { DiscordChannelModule } from '@Modules/discord-channel.module';
import { DiscordGuildModule } from '@Modules/discord-guild.module';
import { DiscordSteamObserversModule } from '@Modules/discord-steam-observers.module';
import { DiscordUsersModule } from '@Modules/discord-users.module';
import { DiscordGuildFeatureGuardModule } from '@Modules/guards/discord-guild-feature-guard.module';
import { SteamApiModule } from '@Modules/api/steam.module';
import { SteamGamesModule } from '@Modules/steam-games.module';
import { SteamUserGamesModule } from '@Modules/steam-user-games.module';
import { SteamUsersModule } from '@Modules/steam-users.module';
import { Module } from '@nestjs/common';
import { SteamObserverCommandsService } from '@Services/discord/steam/steam-observer-commands.service';
import { SteamObserverEmbedBuilderService } from '@Services/discord/steam/steam-observer-embed-builder.service';
import { SteamObserverSchedulerService } from '@Services/discord/steam/steam-observer-scheduler.service';
import { GatewayIntentBits } from 'discord.js';
import { BaseCommandsModule } from './base-commands.module';

@Module({
  imports: [
    SteamApiModule,
    SteamUsersModule,
    SteamGamesModule,
    SteamUserGamesModule,
    DiscordSteamObserversModule,
    DiscordChannelModule,
    DiscordGuildModule,
    DiscordUsersModule,
    DiscordGuildFeatureGuardModule,
  ],
  providers: [
    SteamObserverEmbedBuilderService,
    SteamObserverCommandsService,
    SteamObserverSchedulerService,
    SteamObserverCommandsController,
  ],
})
export class SteamCommandsModule extends BaseCommandsModule {
  static get botIntents(): GatewayIntentBits[] {
    return [...SteamObserverCommandsController.botIntents];
  }
}
