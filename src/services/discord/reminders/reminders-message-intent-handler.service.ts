import { REMINDER_KEYWORDS } from '@Constants/discord/reminders-commands.constant';
import { DiscordFeature } from '@Enums/discord/discord-feature.enum';
import { Injectable } from '@nestjs/common';
import { RemindersCommandsService } from '@Services/discord/reminders-commands.service';
import type { MessageIntentHandler } from '@Types/discord/message-intent-handler.type';
import { startTypingInterval } from '@Utils/functions/send-typing-interval.function';
import { Message, TextChannel } from 'discord.js';

@Injectable()
export class RemindersMessageIntentHandlerService
  implements MessageIntentHandler
{
  readonly name = 'reminders';
  readonly requiredGuildFeature = DiscordFeature.REMINDERS;

  constructor(
    private readonly remindersCommandsService: RemindersCommandsService,
  ) {}

  matches(content: string): boolean {
    const lower = content.toLowerCase();
    return REMINDER_KEYWORDS.some((keyword) => lower.includes(keyword));
  }

  async handle(message: Message): Promise<void> {
    const stopTyping = startTypingInterval(message.channel as TextChannel);

    const embeds =
      await this.remindersCommandsService.handleNaturalLanguageMessage({
        text: message.content,
        discordUserId: message.author.id,
        discordGuildId: message.guild?.id ?? null,
        sourceChannelId: message.channel.id,
      });

    if (stopTyping) stopTyping();

    await message.reply({ embeds });
  }
}
