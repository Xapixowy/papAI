import { GeminiModule } from '@Modules/api/gemini.module';
import { DiscordMessageModule } from '@Modules/discord-message.module';
import { DiscordSettingsModule } from '@Modules/discord-settings.module';
import { DiscordUsersModule } from '@Modules/discord-users.module';
import { Module } from '@nestjs/common';
import { GatewayIntentBits } from 'discord.js';
import { HumanCommandsController } from '../controllers/human-commands.controller';
import { MessageCommandsController } from '../controllers/human/message-commands.controller';
import { SystemPromptCommandsController } from '../controllers/human/system-prompt-commands.controller';
import { EmbedBuilderService } from '../services/embed-builder.service';
import { HumanCommandsService } from '../services/human-commands.service';
import { MessageCommandsService } from '../services/human/message-commands.service';
import { SystemPromptCommandsService } from '../services/human/system-prompt-commands.service';
import { BaseCommandsModule } from './base-commands.module';

@Module({
  imports: [
    DiscordUsersModule,
    DiscordSettingsModule,
    DiscordMessageModule,
    GeminiModule,
  ],
  providers: [
    EmbedBuilderService,
    HumanCommandsService,
    HumanCommandsController,
    MessageCommandsService,
    MessageCommandsController,
    SystemPromptCommandsService,
    SystemPromptCommandsController,
  ],
})
export class HumanCommandsModule extends BaseCommandsModule {
  static get botIntents(): GatewayIntentBits[] {
    return [
      ...HumanCommandsController.botIntents,
      ...MessageCommandsController.botIntents,
      ...SystemPromptCommandsController.botIntents,
    ];
  }
}
