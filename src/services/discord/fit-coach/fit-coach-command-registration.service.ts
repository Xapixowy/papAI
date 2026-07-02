import { FIT_COACH_COMMANDS_CONFIG } from '@Constants/discord/fit-coach-commands.constant';
import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { CommandsService } from 'necord';

@Injectable()
export class FitCoachCommandRegistrationService
  implements OnApplicationBootstrap
{
  constructor(private readonly commandsService: CommandsService) {}

  onApplicationBootstrap(): void {
    const command = this.commandsService.getCommandByName(
      FIT_COACH_COMMANDS_CONFIG.name,
    );
    if (command) {
      command.setGuilds([]);
    }
  }
}
