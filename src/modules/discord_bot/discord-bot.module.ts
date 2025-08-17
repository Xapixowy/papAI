import { DiscordSettingsModule } from '@Modules/discord-settings.module';
import { DiscordUsersModule } from '@Modules/discord-users.module';
import { Module } from '@nestjs/common';
import { InitializeCommandsService } from './commands/initialize-commands.service';

@Module({
  imports: [DiscordUsersModule, DiscordSettingsModule],
  providers: [InitializeCommandsService],
})
export class DiscordBotModule {}
