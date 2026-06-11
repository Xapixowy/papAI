import { GOOD_MORNING_KEYWORDS } from '@Constants/discord/good-morning-commands.constant';
import {
  GET_CONVERSATION_HISTORY_TOOL_NAME,
  HUMAN_GEMINI_TOOLS,
  SEARCH_SAVED_MESSAGES_TOOL_NAME,
} from '@Constants/discord/human-gemini-tools.constant';
import { REGEX_DISCORD_EMOJI, REGEX_EMOJI } from '@Constants/regex.constant';
import { DiscordChannelFeature } from '@Enums/discord/discord-channel-feature.enum';
import { DiscordSettingKey } from '@Enums/discord/discord-setting-key.enum';
import { Part } from '@google/generative-ai';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GeminiService } from '@Services/api/gemini.service';
import { DiscordChannelService } from '@Services/discord-channel.service';
import { DiscordGuildService } from '@Services/discord-guild.service';
import { DiscordMessageService } from '@Services/discord-message.service';
import { DiscordSettingsService } from '@Services/discord-settings.service';
import {
  SearchSavedMessagesArgs,
  HumanGeminiToolsService,
} from '@Services/discord/human/gemini-tools.service';
import { MarkdownHelper } from '@Utils/helpers/markdown.helper';
import { Attachment, Client, EmbedBuilder, GuildEmoji } from 'discord.js';
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
    private readonly humanGeminiToolsService: HumanGeminiToolsService,
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

    const firstResult = await this.geminiService.generateContentWithTools({
      systemPrompt: systemPromptValue,
      queryParts,
      tools: HUMAN_GEMINI_TOOLS,
    });

    if (firstResult.isErr()) {
      this.logger.error('There was an error generating the message.');
      return ['🤷‍♂️'];
    }

    const firstResultValue = firstResult.value;

    if ('text' in firstResultValue) {
      return this.splitOrFallback(firstResultValue.text);
    }

    const [functionCall] = firstResultValue.functionCalls;

    if (functionCall.name === GET_CONVERSATION_HISTORY_TOOL_NAME) {
      const history =
        await this.humanGeminiToolsService.handleGetConversationHistory({
          channelId,
          messageId,
          limit: contextSize,
        });

      const result = await this.geminiService.generateContent({
        systemPrompt: systemPromptValue,
        queryParts,
        conversationHistory: history,
      });

      if (result.isErr()) {
        this.logger.error('There was an error generating the message.');
        return ['🤷‍♂️'];
      }

      return this.splitOrFallback(result.value);
    }

    if (functionCall.name === SEARCH_SAVED_MESSAGES_TOOL_NAME) {
      const searchResult =
        await this.humanGeminiToolsService.handleSearchSavedMessages({
          ...(functionCall.args as SearchSavedMessagesArgs),
          guildId,
        });

      const result =
        await this.geminiService.generateContentWithFunctionResponse({
          systemPrompt: systemPromptValue,
          queryParts,
          modelContent: firstResultValue.modelContent,
          functionCallName: functionCall.name,
          functionResponse: searchResult,
        });

      if (result.isErr()) {
        this.logger.error('There was an error generating the message.');
        return ['🤷‍♂️'];
      }

      return this.splitOrFallback(result.value);
    }

    return ['🤷‍♂️'];
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

  private splitOrFallback(text: string): string[] {
    if (text.length === 0) return ['🤷‍♂️'];
    return MarkdownHelper.splitMessageWithCodeAndPagination({
      text,
      maxPageLength: 1800,
    });
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

  private replaceBotMentionWithName(text: string): string {
    const botId = this.client.user?.id;
    const botName = this.configService.get<string>('discord.botName') ?? 'Bot';

    if (!botId) return text;

    return text.replace(new RegExp(`<@!?${botId}>`, 'g'), botName);
  }
}
