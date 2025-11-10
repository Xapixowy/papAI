import { GuildCommandsController } from '@Controllers/discord/guild-commands.controller';
import { FeatureCommandsController } from '@Controllers/discord/guild/feature-commands.controller';
import { DiscordGuildModule } from '@Modules/discord-guild.module';
import { DiscordSettingsModule } from '@Modules/discord-settings.module';
import { DiscordUsersModule } from '@Modules/discord-users.module';
import { Module } from '@nestjs/common';
import { GuildCommandsService } from '@Services/discord/guild-commands.service';
import { FeatureCommandsService } from '@Services/discord/guild/feature-commands.service';
import { GuildEmbedBuilderService } from '@Services/discord/guild/guild-embed-builder.service';
import { GatewayIntentBits } from 'discord.js';
import { BaseCommandsModule } from './base-commands.module';
import { EmbedBuilderModule } from './services/embed-builder.module';

@Module({
  imports: [
    EmbedBuilderModule,
    DiscordUsersModule,
    DiscordGuildModule,
    DiscordSettingsModule,
  ],
  providers: [
    GuildEmbedBuilderService,
    FeatureCommandsService,
    GuildCommandsService,
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
