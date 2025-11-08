import { TenorModule } from '@Modules/api/tenor.module';
import { DiscordSettingsModule } from '@Modules/discord-settings.module';
import { DiscordUsersModule } from '@Modules/discord-users.module';
import { Module } from '@nestjs/common';
import { GatewayIntentBits } from 'discord.js';
import { GoodMorningCommandsController } from '../controllers/good-morning-commands.controller';
import { QueryCommandsController } from '../controllers/good-morning/query-commands.controller';
import { EmbedBuilderService } from '../services/embed-builder.service';
import { GoodMorningCommandsService } from '../services/good-morning-commands.service';
import { QueryCommandsService } from '../services/good-morning/query-commands.service';
import { BaseCommandsModule } from './base-commands.module';

@Module({
  imports: [DiscordUsersModule, DiscordSettingsModule, TenorModule],
  providers: [
    EmbedBuilderService,
    QueryCommandsService,
    QueryCommandsController,
    GoodMorningCommandsService,
    GoodMorningCommandsController,
  ],
})
export class GoodMorningCommandsModule extends BaseCommandsModule {
  static get botIntents(): GatewayIntentBits[] {
    return [
      ...QueryCommandsController.botIntents,
      ...GoodMorningCommandsController.botIntents,
    ];
  }
}
