import { GOOD_MORNING_KEYWORDS } from '@Constants/discord/good-morning-commands.constant';
import { REGEX_DISCORD_EMOJI, REGEX_EMOJI } from '@Constants/regex.constant';
import { DiscordChannelFeature } from '@Enums/discord/discord-channel-feature.enum';
import { DiscordSettingKey } from '@Enums/discord/discord-setting-key.enum';
import { ErrorCode } from '@Enums/error-code.enum';
import { Part, Tool } from '@google/generative-ai';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GeminiService } from '@Services/api/gemini.service';
import { DiscordChannelService } from '@Services/discord-channel.service';
import { DiscordGuildService } from '@Services/discord-guild.service';
import { DiscordMessageService } from '@Services/discord-message.service';
import { DiscordSettingsService } from '@Services/discord-settings.service';
import { DiscordHumanConversationHistoryMessage } from '@Types/discord/human/conversation-history-message.type';
import { DiscordHumanConversationHistoryMessageConverter } from '@Utils/converters/discord-human-conversation-history-message.converter';
import { MarkdownHelper } from '@Utils/helpers/markdown.helper';
import {
  Attachment,
  Client,
  EmbedBuilder,
  GuildEmoji,
  TextChannel,
} from 'discord.js';
import { err, ok, Result } from 'neverthrow';
import { DiscordAttachmentsHelper } from '../../utils/helpers/discord-attachments.helper';

@Injectable()
export class HumanCommandsService {
  private readonly logger = new Logger(this.constructor.name);

  constructor(
    private readonly discordSettingsService: DiscordSettingsService,
    private readonly geminiService: GeminiService,
    private readonly client: Client,
    private readonly discordMessageService: DiscordMessageService,
    private readonly discordChannelService: DiscordChannelService,
    private readonly discordGuildService: DiscordGuildService,
    private readonly configService: ConfigService,
  ) {}

  public async mentionMessageHandler({
    message,
    messageId,
    channelId,
    guildId,
    attachments,
    userDisplayName,
    userId,
    embedImageUrls,
  }: {
    message: string;
    messageId: string;
    channelId: string;
    guildId: string;
    attachments?: Attachment[];
    userDisplayName: string;
    userId: string;
    embedImageUrls?: string[];
  }): Promise<string[] | EmbedBuilder> {
    const systemPrompt =
      await this.discordSettingsService.getValueByKey<string>({
        key: DiscordSettingKey.HUMAN_SYSTEM_PROMPT,
        guildId,
      });

    if (systemPrompt.isErr()) {
      this.logger.error('There was an error getting the system prompt.');
      return ['🤷‍♂️'];
    }

    const imagesAttachmentsParts =
      await DiscordAttachmentsHelper.convertImagesToGeminiParts(
        attachments ?? [],
      );
    const embedImageParts =
      await DiscordAttachmentsHelper.convertImageUrlsToGeminiParts(
        embedImageUrls ?? [],
      );

    const systemPromptValue = systemPrompt.value;
    const queryParts: Part[] = [
      {
        text: `[${userDisplayName} <@${userId}>]: ${this.replaceBotMentionWithName(message)}`,
      },
      ...imagesAttachmentsParts,
      ...embedImageParts,
    ];

    const contextSizeSetting =
      await this.discordSettingsService.getValueByKey<number>({
        key: DiscordSettingKey.HUMAN_CONTEXT_SIZE,
        guildId,
      });
    const contextSize = contextSizeSetting.isOk()
      ? contextSizeSetting.value
      : 20;

    const tools: Tool[] = [
      {
        functionDeclarations: [
          {
            name: 'get_conversation_history',
            description:
              'Retrieves previous messages from this channel. Call this when the user references something previously said, asks a follow-up question, or when answering requires prior context from this conversation.',
          },
        ],
      },
    ];

    const firstResult = await this.geminiService.generateContentWithTools({
      systemPrompt: systemPromptValue,
      queryParts,
      tools,
    });

    if (firstResult.isErr()) {
      this.logger.error('There was an error generating the message.');
      return ['🤷‍♂️'];
    }

    const firstResultValue = firstResult.value;

    if ('text' in firstResultValue) {
      const text = firstResultValue.text;
      if (text.length === 0) return ['🤷‍♂️'];
      return MarkdownHelper.splitMessageWithCodeAndPagination({
        text,
        maxPageLength: 1800,
      });
    }

    const channelMessageHistory = await this.getChannelMessages(
      channelId,
      messageId,
      contextSize,
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
      this.logger.error('There was an error generating the message.');
      return ['🤷‍♂️'];
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

  public async messageRandomReplyHandler({
    message,
    attachments,
    messageId,
    userId,
    channelId,
    guildId,
    guildEmojis,
  }: {
    message: string;
    attachments?: Attachment[];
    messageId: string;
    userId: string;
    channelId: string;
    guildId: string;
    guildEmojis: GuildEmoji[];
  }): Promise<null | string> {
    const containsGoodMorningKeyword = GOOD_MORNING_KEYWORDS.some((keyword) =>
      message.toLowerCase().startsWith(keyword),
    );

    if (containsGoodMorningKeyword) {
      const goodMorningOnChannel =
        await this.discordChannelService.isFeatureEnabled({
          channelId,
          feature: DiscordChannelFeature.GOOD_MORNING_MESSAGES,
        });
      const goodMorningOnGuild =
        await this.discordGuildService.isChannelFeatureEnabled({
          guildId,
          feature: DiscordChannelFeature.GOOD_MORNING_MESSAGES,
        });

      const isGoodMorningActive =
        (goodMorningOnChannel.isOk() && goodMorningOnChannel.value) ||
        (goodMorningOnChannel.isErr() &&
          goodMorningOnGuild.isOk() &&
          goodMorningOnGuild.value);

      if (isGoodMorningActive) return null;
    }

    const isSaveMessagesFeatureOnChannelEnabled =
      await this.discordChannelService.isFeatureEnabled({
        channelId,
        feature: DiscordChannelFeature.HUMAN_SAVE_MESSAGES,
      });

    const isSaveMessagesFeatureOnGuildEnabled =
      await this.discordGuildService.isChannelFeatureEnabled({
        guildId,
        feature: DiscordChannelFeature.HUMAN_SAVE_MESSAGES,
      });

    const isSaveMessagesFeatureEnabled =
      (isSaveMessagesFeatureOnChannelEnabled.isOk() &&
        isSaveMessagesFeatureOnChannelEnabled.value) ||
      (isSaveMessagesFeatureOnChannelEnabled.isErr() &&
        isSaveMessagesFeatureOnGuildEnabled.isOk() &&
        isSaveMessagesFeatureOnGuildEnabled.value);

    const attachmentUrls: string[] | undefined = attachments?.map(
      (attachment) => attachment.url,
    );

    if (isSaveMessagesFeatureEnabled) {
      await this.discordMessageService.create({
        id: messageId,
        message,
        attachments: attachmentUrls,
        discordUserId: userId,
        discordChannelId: channelId,
        discordGuildId: guildId,
        createdAt: new Date(),
      });
    }

    const isRandomReplyFeatureOnChannelEnabled =
      await this.discordChannelService.isFeatureEnabled({
        channelId,
        feature: DiscordChannelFeature.HUMAN_RANDOM_REPLY,
      });

    const isRandomReplyFeatureOnGuildEnabled =
      await this.discordGuildService.isChannelFeatureEnabled({
        guildId,
        feature: DiscordChannelFeature.HUMAN_RANDOM_REPLY,
      });

    const isRandomReplyFeatureEnabled =
      (isRandomReplyFeatureOnChannelEnabled.isOk() &&
        isRandomReplyFeatureOnChannelEnabled.value) ||
      (isRandomReplyFeatureOnChannelEnabled.isErr() &&
        isRandomReplyFeatureOnGuildEnabled.isOk() &&
        isRandomReplyFeatureOnGuildEnabled.value);

    if (!isRandomReplyFeatureEnabled) {
      return null;
    }

    const humanRandomReplyPercent =
      await this.discordSettingsService.getValueByKey<number>({
        key: DiscordSettingKey.HUMAN_RANDOM_REPLY_PERCENTAGE,
        guildId,
      });

    if (humanRandomReplyPercent.isErr()) {
      this.logger.error(
        'There was an error getting the human random reply percent.',
        humanRandomReplyPercent.error,
      );
      return null;
    }

    const emojis = this.getEmojisFromMessageIfExistsOnGuild({
      message,
      guildEmojis,
    });

    const shouldSendRandomMessage =
      Math.random() * 100 < humanRandomReplyPercent.value;

    if (!shouldSendRandomMessage) {
      return null;
    }

    const shouldSendEmoji =
      emojis !== null && emojis.length > 0 && Math.random() * 100 > 50;

    if (shouldSendEmoji) {
      const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

      return randomEmoji;
    }

    const randomMessageResult =
      await this.discordMessageService.findRandomMessageByGuildId(guildId);

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

  private getEmojisFromMessageIfExistsOnGuild({
    message,
    guildEmojis,
  }: {
    message: string;
    guildEmojis: GuildEmoji[];
  }): string[] | null {
    const guildEmojisFormatted = guildEmojis.map(
      (emoji) => `<${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.id}>`,
    );

    const discordEmojis = message.match(REGEX_DISCORD_EMOJI) ?? [];
    const normalEmojis = message.match(REGEX_EMOJI) ?? [];

    const emojis = [
      ...normalEmojis,
      ...discordEmojis.filter((emoji) => guildEmojisFormatted.includes(emoji)),
    ];

    if (emojis.length === 0) {
      return null;
    }

    return emojis;
  }

  private async getChannelMessages(
    channelId: string,
    messageId: string,
    limit: number = 20,
  ): Promise<Result<DiscordHumanConversationHistoryMessage[], ErrorCode>> {
    try {
      const channel = await this.client.channels.fetch(channelId);

      if (!(channel instanceof TextChannel)) {
        return err(ErrorCode.DISCORD_CHANNEL_WRONG_TYPE);
      }

      const messages = await channel.messages.fetch({
        limit,
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

        const embedImageUrls = message.embeds
          .flatMap((embed) => [embed.image?.url, embed.thumbnail?.url])
          .filter((url): url is string => !!url);
        const embedImageParts =
          await DiscordAttachmentsHelper.convertImageUrlsToGeminiParts(
            embedImageUrls,
          );

        const allImageParts = [...imagesAttachmentsParts, ...embedImageParts];

        const isBot = message.author.id === this.client.user?.id;
        const authorDisplayName = isBot
          ? undefined
          : (message.member?.displayName ??
            message.author.displayName ??
            message.author.username);
        const authorId = isBot ? undefined : message.author.id;

        convertedMessages.push({
          role: isBot ? 'model' : 'user',
          text: this.replaceBotMentionWithName(message.content),
          authorDisplayName,
          authorId,
          attachments: allImageParts.map((part) => ({
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

  private replaceBotMentionWithName(text: string): string {
    const botId = this.client.user?.id;
    const botName = this.configService.get<string>('discord.botName') ?? 'Bot';

    if (!botId) return text;

    return text.replace(new RegExp(`<@!?${botId}>`, 'g'), botName);
  }
}
