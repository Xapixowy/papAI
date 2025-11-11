import { GuildCommandsController } from '@Controllers/discord/guild-commands.controller';
import { FeatureCommandsController } from '@Controllers/discord/guild/feature-commands.controller';
import { DiscordGuildModule } from '@Modules/discord-guild.module';
import { DiscordSettingsModule } from '@Modules/discord-settings.module';
import { DiscordUserRoleGuardModule } from '@Modules/guards/discord-user-role-guard.module';
import { Module } from '@nestjs/common';
import { GuildCommandsService } from '@Services/discord/guild-commands.service';
import { FeatureCommandsService } from '@Services/discord/guild/feature-commands.service';
import { GuildEmbedBuilderService } from '@Services/discord/guild/guild-embed-builder.service';
import { GatewayIntentBits } from 'discord.js';
import { BaseCommandsModule } from './base-commands.module';

@Module({
  imports: [
    DiscordUserRoleGuardModule,
    DiscordGuildModule,
    DiscordSettingsModule,
  ],
  providers: [
    GuildEmbedBuilderService,
    FeatureCommandsService,
    FeatureCommandsController,
    GuildCommandsService,
    GuildCommandsController,
  ],
})
export class GuildCommandsModule extends BaseCommandsModule {
  static get botIntents(): GatewayIntentBits[] {
    return [
      ...FeatureCommandsController.botIntents,
      ...GuildCommandsController.botIntents,
    ];
  }
}
