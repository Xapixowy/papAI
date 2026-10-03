import { CtfdCommandsController } from '@Controllers/discord/ctfd-commands.controller';
import { Module } from '@nestjs/common';
import { CtfdCommandsService } from '@Services/discord/ctfd-commands.service';
import { DiscordSettingsModule } from '../discord-settings.module';

import { DiscordUsersModule } from '../discord-users.module';

@Module({
  imports: [DiscordSettingsModule, DiscordUsersModule],
  controllers: [CtfdCommandsController],
  providers: [CtfdCommandsService],
})
export class CtfdCommandsModule {
  static get botIntents() {
    return CtfdCommandsController.botIntents;
  }
}
