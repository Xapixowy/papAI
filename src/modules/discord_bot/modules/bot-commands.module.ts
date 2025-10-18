import { DiscordUsersModule } from '@Modules/discord-users.module';
import { Module } from '@nestjs/common';
import { GatewayIntentBits } from 'discord.js';
import { BotCommandsController } from '../controllers/bot-commands.controller';
import { BotCommandsService } from '../services/bot-commands.service';
import { EmbedBuilderService } from '../services/embed-builder.service';
import { BaseCommandsModule } from './base-commands.module';

@Module({
  imports: [DiscordUsersModule],
  providers: [EmbedBuilderService, BotCommandsService, BotCommandsController],
})
export class BotCommandsModule extends BaseCommandsModule {
  static get botIntents(): GatewayIntentBits[] {
    return [...BotCommandsController.botIntents];
  }
}
