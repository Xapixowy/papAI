import { GoodMorningCommandsController } from '@Controllers/discord/good-morning-commands.controller';
import { QueryCommandsController } from '@Controllers/discord/good-morning/query-commands.controller';
import { GiphyModule } from '@Modules/api/giphy.module';
import { KlipyModule } from '@Modules/api/klipy.module';
import { TenorModule } from '@Modules/api/tenor.module';
import { DiscordChannelModule } from '@Modules/discord-channel.module';
import { DiscordSettingsModule } from '@Modules/discord-settings.module';
import { Module } from '@nestjs/common';
import { GoodMorningCommandsService } from '@Services/discord/good-morning-commands.service';
import { QueryCommandsService } from '@Services/discord/good-morning/query-commands.service';
import { GatewayIntentBits } from 'discord.js';
import { DiscordGuildFeatureGuardModule } from '../guards/discord-guild-feature-guard.module';
import { DiscordUserRoleGuardModule } from '../guards/discord-user-role-guard.module';
import { BaseCommandsModule } from './base-commands.module';
import { EmbedBuilderModule } from './services/embed-builder.module';

@Module({
  imports: [
    EmbedBuilderModule,
    DiscordGuildFeatureGuardModule,
    DiscordUserRoleGuardModule,
    DiscordSettingsModule,
    DiscordChannelModule,
    TenorModule,
    GiphyModule,
    KlipyModule,
  ],
  providers: [
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
