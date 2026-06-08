import { AdminCronCommandsController } from '@Controllers/discord/admin-commands.controller';
import { DiscordUserRoleGuardModule } from '@Modules/guards/discord-user-role-guard.module';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AdminCronCommandsService } from '@Services/discord/admin/admin-cron-commands.service';
import { AdminEmbedBuilderService } from '@Services/discord/admin/admin-embed-builder.service';
import { GatewayIntentBits } from 'discord.js';
import { BaseCommandsModule } from './base-commands.module';

@Module({
  imports: [DiscordUserRoleGuardModule, ScheduleModule],
  providers: [
    AdminEmbedBuilderService,
    AdminCronCommandsService,
    AdminCronCommandsController,
  ],
})
export class AdminCommandsModule extends BaseCommandsModule {
  static get botIntents(): GatewayIntentBits[] {
    return [...AdminCronCommandsController.botIntents];
  }
}
