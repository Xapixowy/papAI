import { DiscordSettingKey } from '@Enums/discord-setting-key.enum';
import { ErrorCode } from '@Enums/error-code.enum';
import { Part } from '@google/generative-ai';
import { Injectable, Logger } from '@nestjs/common';
import { GeminiService } from '@Services/api/gemini.service';
import { DiscordMessageService } from '@Services/discord-message.service';
import { DiscordSettingsService } from '@Services/discord-settings.service';
import { DiscordHumanConversationHistoryMessage } from '@Types/discord/human/conversation-history-message.type';
import { DiscordHumanConversationHistoryMessageConverter } from '@Utils/converters/discord-human-conversation-history-message.converter';
import { MarkdownHelper } from '@Utils/helpers/markdown.helper';
import { Attachment, Client, EmbedBuilder, TextChannel } from 'discord.js';
import { err, ok, Result } from 'neverthrow';
import { HUMAN_COMMANDS_CONFIG } from '../configs/human-commands.config';
import { EmbedVariant } from '../types/embed-variant.type';
import { DiscordAttachmentsHelper } from '../utils/helpers/discord-attachments.helper';
import { EmbedBuilderService } from './embed-builder.service';

@Injectable()
export class HumanCommandsService {
  private readonly logger = new Logger(this.constructor.name);

  constructor(
    private readonly discordSettingsService: DiscordSettingsService,
    private readonly embedBuilderService: EmbedBuilderService,
    private readonly geminiService: GeminiService,
    private readonly client: Client,
    private readonly discordMessageService: DiscordMessageService,
  ) {}

  public async messageRandomReplyHandler({
    message,
    attachments,
    messageId,
    userId,
    channelId,
    serverId,
    percentChance,
  }: {
    message: string;
    attachments?: Attachment[];
    messageId: string;
    userId: string;
    channelId: string;
    serverId: string;
    percentChance: number;
  }): Promise<null | string> {
    const attachmentUrls: string[] | undefined = attachments?.map(
      (attachment) => attachment.url,
    );

    // TODO: Implement this
    // const channelConfig = await this.discordGuildConfigService.findById({
    //   id: serverId,
    // });

    // if (channelConfig.isErr()) {
    //   return null;
    // }

    // const { humanRandomReply, humanSaveMessages } = channelConfig.value;

    await this.discordMessageService.create({
      id: messageId,
      message,
      attachments: attachmentUrls,
      discordUserId: userId,
      discordChannelId: channelId,
      discordServerId: serverId,
      createdAt: new Date(),
    });

    const randomChance = Math.random() * 100;

    if (randomChance > percentChance) {
      return null;
    }

    const randomMessageResult =
      await this.discordMessageService.findRandomMessageByServerId(serverId);

    if (randomMessageResult.isErr() || randomMessageResult.value.length === 0) {
      return null;
    }

    const randomMessage = randomMessageResult.value[0];

    let finalMessage: string = '';

    if (randomMessage.message) {
      finalMessage += randomMessage.message;
    }

    if (randomMessage.attachments?.length) {
      finalMessage += randomMessage.attachments?.join(' ');
    }

    return finalMessage;
  }

  public async mentionMessageHandler({
    message,
    messageId,
    channelId,
    attachments,
  }: {
    message: string;
    messageId: string;
    channelId: string;
    attachments?: Attachment[];
  }): Promise<string[] | EmbedBuilder> {
    const systemPrompt =
      await this.discordSettingsService.getValueByKey<string>(
        DiscordSettingKey.HUMAN_SYSTEM_PROMPT,
      );

    if (systemPrompt.isErr()) {
      return this.generateSimpleEmbed({
        description: 'There was an error getting the system prompt.',
        variant: 'error',
      });
    }

    const imagesAttachmentsParts =
      await DiscordAttachmentsHelper.convertImagesToGeminiParts(
        attachments ?? [],
      );

    const systemPromptValue = systemPrompt.value;
    const queryParts: Part[] = [{ text: message }, ...imagesAttachmentsParts];

    const channelMessageHistory = await this.getChannelMessages(
      channelId,
      messageId,
    );
    const channelMessageHistoryOk = channelMessageHistory
      .match(
        (messages) => messages,
        () => [] as DiscordHumanConversationHistoryMessage[],
      )
      .filter((message) => {
        if (message.messageId === undefined) {
          return true;
        }

        return message.messageId !== messageId;
      })
      .sort((a, b) => {
        const aDate = new Date(a.createdAt);
        const bDate = new Date(b.createdAt);

        return aDate.getTime() - bDate.getTime();
      });

    const channelMessageHistoryContent = channelMessageHistoryOk.map(
      (message) =>
        DiscordHumanConversationHistoryMessageConverter.toGeminiContent(
          message,
        ),
    );

    const generationResult = await this.geminiService.generateContent({
      systemPrompt: systemPromptValue,
      queryParts: queryParts,
      conversationHistory: channelMessageHistoryContent,
    });

    if (generationResult.isErr()) {
      return this.generateSimpleEmbed({
        description: 'There was an error generating the message.',
        variant: 'error',
      });
    }

    const generationResultValue = generationResult.value;

    if (generationResultValue.length === 0) {
      return ['🤷‍♂️'];
    }

    return MarkdownHelper.splitMessageWithCodeAndPagination({
      text: generationResultValue,
      maxPageLength: 1800,
    });
  }

  private async getChannelMessages(
    channelId: string,
    messageId: string,
  ): Promise<Result<DiscordHumanConversationHistoryMessage[], ErrorCode>> {
    try {
      const channel = await this.client.channels.fetch(channelId);

      if (!(channel instanceof TextChannel)) {
        return err(ErrorCode.DISCORD_CHANNEL_WRONG_TYPE);
      }

      const messages = await channel.messages.fetch({
        limit: 20,
        before: messageId,
      });

      const convertedMessages: DiscordHumanConversationHistoryMessage[] = [];

      for (const message of Array.from(messages.values())) {
        const attachments = message.attachments.map((attachment) => attachment);

        const imageAttachments =
          DiscordAttachmentsHelper.filterImages(attachments);

        const imagesAttachmentsParts =
          await DiscordAttachmentsHelper.convertImagesToGeminiParts(
            imageAttachments,
          );

        convertedMessages.push({
          role: message.author.id === this.client.user?.id ? 'model' : 'user',
          text: message.content,
          attachments: imagesAttachmentsParts.map((part) => ({
            contentType: part.inlineData!.mimeType,
            data: part.inlineData!.data,
          })),
          createdAt: message.createdAt.toISOString(),
          messageId: message.id,
        });
      }

      return ok(convertedMessages);
    } catch {
      return err(ErrorCode.DISCORD_CHANNEL_NOT_FOUND);
    }
  }

  private generateSimpleEmbed({
    description,
    variant,
  }: {
    description: string;
    variant: EmbedVariant;
  }): EmbedBuilder {
    return this.embedBuilderService.simple({
      description: description,
      title: HUMAN_COMMANDS_CONFIG.embed.title,
      thumbnail: HUMAN_COMMANDS_CONFIG.embed.thumbnail,
      variant: variant,
      logger: this.logger,
    });
  }
}
