import { CtfdCommandsController } from '@Controllers/discord/ctfd-commands.controller';
import { Module } from '@nestjs/common';
import { CtfdCommandsService } from '@Services/discord/ctfd-commands.service';
import { DiscordSettingsModule } from '../discord-settings.module';

import { DiscordUsersModule } from '../discord-users.module';
import { BaseCommandsModule } from './base-commands.module';

@Module({
  imports: [DiscordSettingsModule, DiscordUsersModule],
  providers: [CtfdCommandsController, CtfdCommandsService],
})
export class CtfdCommandsModule extends BaseCommandsModule {
  static get botIntents() {
    return CtfdCommandsController.botIntents;
  }
}
