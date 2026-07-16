import { REMINDER_COMMANDS_CONFIG } from '@Constants/discord/reminders-commands.constant';
import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { CommandsService } from 'necord';

@Injectable()
export class RemindersCommandRegistrationService
  implements OnApplicationBootstrap
{
  constructor(private readonly commandsService: CommandsService) {}

  onApplicationBootstrap(): void {
    const command = this.commandsService.getCommandByName(
      REMINDER_COMMANDS_CONFIG.name,
    );
    if (command) {
      command.setGuilds([]);
    }
  }
}
