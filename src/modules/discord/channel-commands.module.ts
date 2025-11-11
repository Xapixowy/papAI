import { ChannelCommandsController } from '@Controllers/discord/channel-commands.controller';
import { FeatureCommandsController } from '@Controllers/discord/channel/feature-commands.controller';
import { DiscordChannelModule } from '@Modules/discord-channel.module';
import { DiscordUserRoleGuardModule } from '@Modules/guards/discord-user-role-guard.module';
import { Module } from '@nestjs/common';
import { ChannelCommandsService } from '@Services/discord/channel-commands.service';
import { ChannelEmbedBuilderService } from '@Services/discord/channel/channel-embed-builder.service';
import { FeatureCommandsService } from '@Services/discord/channel/feature-commands.service';
import { GatewayIntentBits } from 'discord.js';
import { BaseCommandsModule } from './base-commands.module';

@Module({
  imports: [DiscordUserRoleGuardModule, DiscordChannelModule],
  providers: [
    ChannelEmbedBuilderService,
    FeatureCommandsService,
    FeatureCommandsController,
    ChannelCommandsService,
    ChannelCommandsController,
  ],
})
export class ChannelCommandsModule extends BaseCommandsModule {
  static get botIntents(): GatewayIntentBits[] {
    return [
      ...FeatureCommandsController.botIntents,
      ...ChannelCommandsController.botIntents,
    ];
  }
}
