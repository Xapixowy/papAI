import { DiscordUsersModule } from '@Modules/discord-users.module';
import { Module } from '@nestjs/common';
import { RadarrHttpClientService } from '@Services/http/radarr-http-client.service';
import { GatewayIntentBits } from 'discord.js';
import { RadarrCommandsController } from '../controllers/radarr-commands.controller';
import { RadarrCommandsService } from '../services/radarr-commands.service';
import { BaseCommandsModule } from './base-commands.module';

@Module({
  imports: [DiscordUsersModule],
  providers: [
    RadarrHttpClientService,
    RadarrCommandsService,
    RadarrCommandsController,
  ],
})
export class RadarrCommandsModule extends BaseCommandsModule {
  static get botIntents(): GatewayIntentBits[] {
    return [...RadarrCommandsController.botIntents];
  }
}
