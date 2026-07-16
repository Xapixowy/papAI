import { RemindersMessageCommandsController } from '@Controllers/discord/reminders-commands.controller';
import { RemindersCommandsController } from '@Controllers/discord/reminders/reminder-commands.controller';
import { GeminiModule } from '@Modules/api/gemini.module';
import { DiscordGuildFeatureGuardModule } from '@Modules/guards/discord-guild-feature-guard.module';
import { DiscordUserRoleGuardModule } from '@Modules/guards/discord-user-role-guard.module';
import { RemindersModule } from '@Modules/reminders.module';
import { Module } from '@nestjs/common';
import { RemindersCommandsService } from '@Services/discord/reminders-commands.service';
import { RemindersCommandRegistrationService } from '@Services/discord/reminders/reminders-command-registration.service';
import { RemindersGeminiToolsService } from '@Services/discord/reminders/gemini-tools.service';
import { RemindersSchedulerService } from '@Services/discord/reminders/reminders-scheduler.service';
import { GatewayIntentBits } from 'discord.js';
import { BaseCommandsModule } from './base-commands.module';
import { EmbedBuilderModule } from './services/embed-builder.module';

@Module({
  imports: [
    EmbedBuilderModule,
    DiscordGuildFeatureGuardModule,
    DiscordUserRoleGuardModule,
    GeminiModule,
    RemindersModule,
  ],
  providers: [
    RemindersCommandsService,
    RemindersGeminiToolsService,
    RemindersSchedulerService,
    RemindersCommandRegistrationService,
    RemindersCommandsController,
    RemindersMessageCommandsController,
  ],
})
export class RemindersCommandsModule extends BaseCommandsModule {
  static get botIntents(): GatewayIntentBits[] {
    return [
      ...RemindersCommandsController.botIntents,
      ...RemindersMessageCommandsController.botIntents,
    ];
  }
}
