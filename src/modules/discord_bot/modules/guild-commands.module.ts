import { DiscordGuildConfigModule } from '@Modules/discord-guild-config.module';
import { DiscordUsersModule } from '@Modules/discord-users.module';
import { Module } from '@nestjs/common';
import { GatewayIntentBits } from 'discord.js';
import { GuildCommandsController } from '../controllers/guild-commands.controller';
import { FeatureCommandsController } from '../controllers/guild/feature-commands.controller';
import { EmbedBuilderService } from '../services/embed-builder.service';
import { FeatureCommandsService } from '../services/guild/feature-commands.service';
import { BaseCommandsModule } from './base-commands.module';

@Module({
  imports: [DiscordUsersModule, DiscordGuildConfigModule],
  providers: [
    EmbedBuilderService,
    FeatureCommandsService,
    GuildCommandsController,
    FeatureCommandsController,
  ],
})
export class GuildCommandsModule extends BaseCommandsModule {
  static get botIntents(): GatewayIntentBits[] {
    return [
      ...GuildCommandsController.botIntents,
      ...FeatureCommandsController.botIntents,
    ];
  }
}
