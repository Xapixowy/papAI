import { DiscordFeature } from '@Enums/discord/discord-feature.enum';
import { Injectable } from '@nestjs/common';
import { HumanCommandsService } from '@Services/discord/human-commands.service';
import type { MessageIntentHandler } from '@Types/discord/message-intent-handler.type';
import { startTypingInterval } from '@Utils/functions/send-typing-interval.function';
import { EmbedBuilder, Message, TextChannel } from 'discord.js';

@Injectable()
export class HumanMessageIntentHandlerService implements MessageIntentHandler {
  readonly name = 'human';
  readonly requiredGuildFeature = DiscordFeature.HUMAN;

  constructor(private readonly humanCommandsService: HumanCommandsService) {}

  matches(): boolean {
    return true;
  }

  async handle(message: Message): Promise<void> {
    const guildId = message.guild?.id;

    if (!guildId) {
      return;
    }

    const stopTyping = startTypingInterval(message.channel as TextChannel);

    const attachments = message.attachments.map((attachment) => attachment);
    const userDisplayName =
      message.member?.displayName ??
      message.author.globalName ??
      message.author.username;
    const embedImageUrls = message.embeds
      .flatMap((embed) => [embed.image?.url, embed.thumbnail?.url])
      .filter((url): url is string => !!url);

    const generatedMessage =
      await this.humanCommandsService.mentionMessageHandler({
        message: message.content,
        channelId: message.channel.id,
        messageId: message.id,
        guildId,
        attachments,
        userDisplayName,
        userId: message.author.id,
        embedImageUrls,
      });

    if (stopTyping) stopTyping();

    if (generatedMessage[0] instanceof EmbedBuilder) {
      await message.reply({
        embeds: generatedMessage as EmbedBuilder[],
      });
      return;
    }

    for (const page of generatedMessage as string[]) {
      await message.reply({ content: page });
    }
  }
}
