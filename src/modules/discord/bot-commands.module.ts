import { BotCommandsController } from '@Controllers/discord/bot-commands.controller';
import { DiscordUsersModule } from '@Modules/discord-users.module';
import { Module } from '@nestjs/common';
import { BotCommandsService } from '@Services/discord/bot-commands.service';
import { GatewayIntentBits } from 'discord.js';
import { BaseCommandsModule } from './base-commands.module';
import { EmbedBuilderModule } from './services/embed-builder.module';

@Module({
  imports: [EmbedBuilderModule, DiscordUsersModule],
  providers: [BotCommandsService, BotCommandsController],
})
export class BotCommandsModule extends BaseCommandsModule {
  static get botIntents(): GatewayIntentBits[] {
    return [...BotCommandsController.botIntents];
  }
}
