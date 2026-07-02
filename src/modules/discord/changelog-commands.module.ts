import { ChangelogCommandsController } from '@Controllers/discord/changelog-commands.controller';
import { Module } from '@nestjs/common';
import { ChangelogCommandsService } from '@Services/discord/changelog-commands.service';
import { GatewayIntentBits } from 'discord.js';
import { BaseCommandsModule } from './base-commands.module';

@Module({
  providers: [ChangelogCommandsService, ChangelogCommandsController],
})
export class ChangelogCommandsModule extends BaseCommandsModule {
  static get botIntents(): GatewayIntentBits[] {
    return [...ChangelogCommandsController.botIntents];
  }
}
