import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GatewayIntentBits } from 'discord.js';
import { WowCommandsController } from '@Controllers/discord/wow-commands.controller';
import { WowObserverCommandsController } from '@Controllers/discord/wow/wow-observer-commands.controller';
import { WowConfigCommandsController } from '@Controllers/discord/wow/wow-config-commands.controller';
import { WowInteractionController } from '@Controllers/discord/wow/wow-interaction.controller';
import { WowInteractionService } from '@Services/wow/wow-interaction.service';
import { WowCommandsService } from '@Services/wow/wow-commands.service';
import { WowMonitorService } from '@Services/wow/wow-monitor.service';
import { WowEmbedService } from '@Services/wow/wow-embed.service';
import { WowSourceService } from '@Services/wow/wow-source.service';
import { WowForumService } from '@Services/wow/wow-forum.service';
import { WowStoreService } from '@Services/wow/wow-store.service';
import { DiscordGuildFeatureGuardModule } from '@Modules/guards/discord-guild-feature-guard.module';
import { DiscordUserRoleGuardModule } from '@Modules/guards/discord-user-role-guard.module';
import { BaseCommandsModule } from '@Modules/discord/base-commands.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10_000,
      maxContentLength: 8 * 1024 * 1024,
      maxBodyLength: 1024 * 1024,
    }),
    DiscordGuildFeatureGuardModule,
    DiscordUserRoleGuardModule,
  ],
  providers: [
    WowCommandsController,
    WowObserverCommandsController,
    WowConfigCommandsController,
    WowInteractionController,
    WowInteractionService,
    WowCommandsService,
    WowMonitorService,
    WowEmbedService,
    WowSourceService,
    WowForumService,
    WowStoreService,
  ],
})
export class WowCommandsModule extends BaseCommandsModule {
  static get botIntents(): GatewayIntentBits[] {
    return [GatewayIntentBits.Guilds];
  }
}
