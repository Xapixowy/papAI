import { DiscordSettingsModule } from '@Modules/discord-settings.module';
import { DiscordUsersModule } from '@Modules/discord-users.module';
import { Module } from '@nestjs/common';
import { InitializeGateway } from './commands/initialize.gateway';

@Module({
  imports: [DiscordUsersModule, DiscordSettingsModule],
  providers: [InitializeGateway],
})
export class DiscordBotModule {}
