import { GeminiModule } from '@Modules/api/gemini.module';
import { TenorModule } from '@Modules/api/tenor.module';
import { DiscordSettingsModule } from '@Modules/discord-settings.module';
import { DiscordUsersModule } from '@Modules/discord-users.module';
import { Module } from '@nestjs/common';
import { GatewayIntentBits } from 'discord.js';
import { HumanCommandsController } from '../controllers/human-commands.controller';
import { ConfigCommandsController } from '../controllers/human/config-commands.controller';
import { EmbedBuilderService } from '../services/embed-builder.service';
import { HumanCommandsService } from '../services/human-commands.service';
import { BaseCommandsModule } from './base-commands.module';

@Module({
  imports: [
    DiscordUsersModule,
    DiscordSettingsModule,
    TenorModule,
    GeminiModule,
  ],
  providers: [
    EmbedBuilderService,
    HumanCommandsService,
    ConfigCommandsController,
    HumanCommandsController,
  ],
})
export class HumanCommandsModule extends BaseCommandsModule {
  static get botIntents(): GatewayIntentBits[] {
    return [
      ...ConfigCommandsController.botIntents,
      ...HumanCommandsController.botIntents,
    ];
  }
}
