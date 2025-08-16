import { DiscordUserModule } from '@Modules/discord-user.module';
import { Module } from '@nestjs/common';
import { InitializeGateway } from './commands/initialize.gateway';

@Module({
  imports: [DiscordUserModule],
  providers: [InitializeGateway],
})
export class DiscordBotModule {}
