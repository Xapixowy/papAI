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
  public async onMentionMessage(
    @Context() [message]: [Message],
  ): Promise<void> {
    const isBotMessage = message.author.bot;
    const isBotMention = message.mentions.users.has(this.client.user!.id);
    const isMessageTextChannel = message.channel instanceof TextChannel;

    if (isBotMessage || !isBotMention || !isMessageTextChannel) return;

    const stopTyping = startTypingInterval(message.channel);

    const attachments = message.attachments.map((attachment) => attachment);

    const generatedMessage =
      await this.humanCommandsService.mentionMessageHandler({
        message: message.content,
        channelId: message.channel.id,
        messageId: message.id,
        attachments,
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

  @On('messageCreate')
  public async onMessageRandomReply(
    @Context() [message]: [Message],
  ): Promise<void> {
    const isBotMessage = message.author.bot;
    const isBotMention = message.mentions.users.has(this.client.user!.id);
    const isMessageTextChannel = message.channel instanceof TextChannel;
    const isMessageInGuild = message.guild;

    if (
      isBotMessage ||
      isBotMention ||
      !isMessageTextChannel ||
      !isMessageInGuild
    )
      return;

    // TODO: Temporarily disabled
    return;

    // const attachments = message.attachments.map((attachment) => attachment);

    // const replyMessage =
    //   await this.humanCommandsService.messageRandomReplyHandler({
    //     message: message.content,
    //     attachments: attachments.length ? attachments : undefined,
    //     messageId: message.id,
    //     userId: message.author.id,
    //     channelId: message.channel.id,
    //     serverId: message.guild.id,
    //     percentChance: 5,
    //   });

    // if (!replyMessage) {
    //   return;
    // }

    // await message.reply({
    //   content: replyMessage,
    // });
  }
}
