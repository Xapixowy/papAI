import { DiscordSettingKey } from '@Enums/discord-setting-key.enum';
import { ErrorCode } from '@Enums/error-code.enum';
import { Part } from '@google/generative-ai';
import { Injectable } from '@nestjs/common';
import { GeminiService } from '@Services/api/gemini.service';
import { TenorService } from '@Services/api/tenor.service';
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
  constructor(
    private readonly discordSettingsService: DiscordSettingsService,
    private readonly embedBuilderService: EmbedBuilderService,
    private readonly tenorService: TenorService,
    private readonly geminiService: GeminiService,
    private readonly client: Client,
  ) {}

  public async configGetGMGIFQueryHandler(): Promise<EmbedBuilder> {
    const gmGifQuery = await this.discordSettingsService.getValueByKey<string>(
      DiscordSettingKey.HUMAN_GM_GIF_QUERY,
    );

    if (gmGifQuery.isErr()) {
      return this.generateSimpleEmbed({
        description: 'There was an error getting the GM GIF query.',
        variant: 'error',
      });
    }

    const gmGifQueryValue = gmGifQuery.value;

    return this.generateSimpleEmbed({
      description: `GM GIF query is set to \`${gmGifQueryValue}\`.`,
      variant: 'success',
    });
  }

  public async configSetGMGIFQueryHandler({
    gmGifQuery,
  }: {
    gmGifQuery: string;
  }): Promise<EmbedBuilder> {
    const gmGifQuerySetting = await this.discordSettingsService.set(
      DiscordSettingKey.HUMAN_GM_GIF_QUERY,
      gmGifQuery,
    );

    if (gmGifQuerySetting.isErr()) {
      return this.generateSimpleEmbed({
        description: 'There was an error setting the GM GIF query.',
        variant: 'error',
      });
    }

    return this.generateSimpleEmbed({
      description: `GM GIF query set to \`${gmGifQuery}\`.`,
      variant: 'success',
    });
  }

  public async gmMessageHandler(): Promise<string | EmbedBuilder> {
    const gmGifQuery = await this.discordSettingsService.getValueByKey<string>(
      DiscordSettingKey.HUMAN_GM_GIF_QUERY,
    );

    if (gmGifQuery.isErr()) {
      return this.generateSimpleEmbed({
        description: 'There was an error getting the GM GIF query.',
        variant: 'error',
      });
    }

    const gmGifQueryValue = gmGifQuery.value;

    const gifResult = await this.tenorService.searchGifs({
      query: gmGifQueryValue,
      limit: 1,
      random: true,
    });

    if (gifResult.isErr()) {
      return this.generateSimpleEmbed({
        description: 'There was an error searching for a GIF.',
        variant: 'error',
      });
    }

    const gifResultValue = gifResult.value;

    if (gifResultValue.results?.length === 0) {
      return this.generateSimpleEmbed({
        description: 'No GIF found.',
        variant: 'error',
      });
    }

    const gifUrl = gifResultValue.results[0]?.media_formats?.gif?.url;

    if (!gifUrl) {
      return this.generateSimpleEmbed({
        description: 'No GIF URL found.',
        variant: 'error',
      });
    }

    return gifUrl;
  }

  public async configGetSystemPromptHandler(): Promise<EmbedBuilder> {
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

    const systemPromptValue = systemPrompt.value;

    return this.generateSimpleEmbed({
      description: `System prompt is set to \`${systemPromptValue}\`.`,
      variant: 'success',
    });
  }

  public async configSetSystemPromptHandler({
    systemPrompt,
  }: {
    systemPrompt: string;
  }): Promise<EmbedBuilder> {
    const systemPromptSetting = await this.discordSettingsService.set(
      DiscordSettingKey.HUMAN_SYSTEM_PROMPT,
      systemPrompt,
    );

    if (systemPromptSetting.isErr()) {
      return this.generateSimpleEmbed({
        description: 'There was an error setting the system prompt.',
        variant: 'error',
      });
    }

    return this.generateSimpleEmbed({
      description: `System prompt set to \`${systemPrompt}\`.`,
      variant: 'success',
    });
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
    });
  }
}
