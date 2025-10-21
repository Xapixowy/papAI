import { Injectable, UseGuards } from '@nestjs/common';
import {
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  Message,
  TextChannel,
} from 'discord.js';
import { Context, createCommandGroupDecorator, On } from 'necord';
import { HUMAN_COMMANDS_CONFIG } from '../configs/human-commands.config';
import { DiscordUserRoleGuard } from '../guards/discord-user-role.guard';
import { HumanCommandsService } from '../services/human-commands.service';
import { startTypingInterval } from '../utils/functions/send-typing-interval.function';
import { BaseCommandsController } from './base-commands.controller';

export const HumanCommandDecorator = createCommandGroupDecorator({
  name: HUMAN_COMMANDS_CONFIG.name,
  description: HUMAN_COMMANDS_CONFIG.description,
});

@Injectable()
@UseGuards(DiscordUserRoleGuard)
@HumanCommandDecorator()
export class HumanCommandsController extends BaseCommandsController {
  constructor(
    private readonly humanCommandsService: HumanCommandsService,
    private readonly client: Client,
  ) {
    super();
  }

  static get botIntents(): GatewayIntentBits[] {
    return [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ];
  }

  @On('messageCreate')
  public async onGoodMorningMessage(
    @Context() [message]: [Message],
  ): Promise<void> {
    if (message.author.bot) return;

    const messageContentLower = message.content.toLowerCase();

    if (!messageContentLower.includes('gm')) {
      return;
    }

    const gmMessage = await this.humanCommandsService.gmMessageHandler();

    if (gmMessage instanceof EmbedBuilder) {
      await message.reply({
        embeds: [gmMessage],
      });
      return;
    }

    await message.reply({
      content: gmMessage,
    });
  }

  @On('messageCreate')
  public async onMessage(@Context() [message]: [Message]): Promise<void> {
    const isBotMessage = message.author.bot;
    const isBotMention = message.mentions.users.has(this.client.user!.id);
    const isMessageTextChannel = message.channel instanceof TextChannel;

    if (isBotMessage || !isBotMention || !isMessageTextChannel) return;

    const stopTyping = startTypingInterval(message.channel);

    const generatedMessage =
      await this.humanCommandsService.mentionMessageHandler({
        message: message.content,
        channelId: message.channel.id,
        messageId: message.id,
      });

    if (stopTyping) stopTyping();

    if (generatedMessage instanceof EmbedBuilder) {
      await message.reply({
        embeds: [generatedMessage],
      });
      return;
    }

    for (const page of generatedMessage) {
      await message.reply({ content: page });
    }
  }
}
