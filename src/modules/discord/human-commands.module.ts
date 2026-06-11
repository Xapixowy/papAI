import { HumanCommandsController } from '@Controllers/discord/human-commands.controller';
import { ContextSizeCommandsController } from '@Controllers/discord/human/context-size-commands.controller';
import { MessageCommandsController } from '@Controllers/discord/human/message-commands.controller';
import { RandomReplyPercentageCommandsController } from '@Controllers/discord/human/random-reply-percentage-commands.controller';
import { SystemPromptCommandsController } from '@Controllers/discord/human/system-prompt-commands.controller';
import { GeminiModule } from '@Modules/api/gemini.module';
import { DiscordChannelModule } from '@Modules/discord-channel.module';
import { DiscordMessageModule } from '@Modules/discord-message.module';
import { DiscordSettingsModule } from '@Modules/discord-settings.module';
import { DiscordUsersModule } from '@Modules/discord-users.module';
import { DiscordGuildFeatureGuardModule } from '@Modules/guards/discord-guild-feature-guard.module';
import { DiscordUserRoleGuardModule } from '@Modules/guards/discord-user-role-guard.module';
import { Module } from '@nestjs/common';
import { HumanCommandsService } from '@Services/discord/human-commands.service';
import { ContextSizeCommandsService } from '@Services/discord/human/context-size-commands.service';
import { MessageCommandsService } from '@Services/discord/human/message-commands.service';
import { RandomReplyPercentageCommandsService } from '@Services/discord/human/random-reply-percentage-commands.service';
import { SystemPromptCommandsService } from '@Services/discord/human/system-prompt-commands.service';
import { GatewayIntentBits } from 'discord.js';
import { BaseCommandsModule } from './base-commands.module';
import { EmbedBuilderModule } from './services/embed-builder.module';

@Module({
  imports: [
    EmbedBuilderModule,
    DiscordGuildFeatureGuardModule,
    DiscordUserRoleGuardModule,
    DiscordUsersModule,
    DiscordSettingsModule,
    DiscordMessageModule,
    DiscordChannelModule,
    GeminiModule,
  ],
  providers: [
    HumanCommandsService,
    HumanCommandsController,
    MessageCommandsService,
    MessageCommandsController,
    RandomReplyPercentageCommandsService,
    RandomReplyPercentageCommandsController,
    SystemPromptCommandsService,
    SystemPromptCommandsController,
    ContextSizeCommandsService,
    ContextSizeCommandsController,
  ],
})
export class HumanCommandsModule extends BaseCommandsModule {
  static get botIntents(): GatewayIntentBits[] {
    return [
      ...HumanCommandsController.botIntents,
      ...MessageCommandsController.botIntents,
      ...RandomReplyPercentageCommandsController.botIntents,
      ...SystemPromptCommandsController.botIntents,
      ...ContextSizeCommandsController.botIntents,
    ];
  }
}
