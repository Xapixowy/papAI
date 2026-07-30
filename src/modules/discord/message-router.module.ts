import { MessageRouterController } from '@Controllers/discord/message-router.controller';
import { DiscordGuildModule } from '@Modules/discord-guild.module';
import { Module } from '@nestjs/common';
import { GatewayIntentBits } from 'discord.js';
import { BaseCommandsModule } from './base-commands.module';
import { HumanCommandsModule } from './human-commands.module';
import { RemindersCommandsModule } from './reminders-commands.module';

@Module({
  imports: [DiscordGuildModule, RemindersCommandsModule, HumanCommandsModule],
  providers: [MessageRouterController],
})
export class MessageRouterModule extends BaseCommandsModule {
  static get botIntents(): GatewayIntentBits[] {
    return [...MessageRouterController.botIntents];
  }
}
