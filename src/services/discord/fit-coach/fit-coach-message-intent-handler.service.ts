import { Injectable } from '@nestjs/common';
import { FitCoachCommandsService } from '@Services/discord/fit-coach-commands.service';
import type { MessageIntentHandler } from '@Types/discord/message-intent-handler.type';
import { DMChannel, Message } from 'discord.js';

@Injectable()
export class FitCoachMessageIntentHandlerService
  implements MessageIntentHandler
{
  readonly name = 'fit-coach';

  constructor(
    private readonly fitCoachCommandsService: FitCoachCommandsService,
  ) {}

  matches(): boolean {
    return true;
  }

  async handle(message: Message): Promise<void> {
    const attachments = message.attachments.map((a) => a);

    await this.fitCoachCommandsService.handleDmMessage({
      userId: message.author.id,
      content: message.content,
      attachments,
      channel: message.channel as DMChannel,
    });
  }
}
