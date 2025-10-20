import { DiscordSettingKey } from '@Enums/discord-setting-key.enum';
import { Part } from '@google/generative-ai';
import { Injectable } from '@nestjs/common';
import { GeminiService } from '@Services/api/gemini.service';
import { TenorService } from '@Services/api/tenor.service';
import { DiscordHumanConversationHistoryService } from '@Services/discord-human-conversation-history.service';
import { DiscordSettingsService } from '@Services/discord-settings.service';
import { DiscordHumanConversationHistoryMessageConverter } from '@Utils/converters/discord-human-conversation-history-message.converter';
import { MarkdownHelper } from '@Utils/helpers/markdown.helper';
import { EmbedBuilder } from 'discord.js';
import { HUMAN_COMMANDS_CONFIG } from '../configs/human-commands.config';
import { EmbedVariant } from '../types/embed-variant.type';
import { EmbedBuilderService } from './embed-builder.service';

@Injectable()
export class HumanCommandsService {
  constructor(
    private readonly discordSettingsService: DiscordSettingsService,
    private readonly embedBuilderService: EmbedBuilderService,
    private readonly tenorService: TenorService,
    private readonly geminiService: GeminiService,
    private readonly discordHumanConversationHistoryService: DiscordHumanConversationHistoryService,
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
    channelId,
    attachments,
  }: {
    message: string;
    channelId: string;
    attachments?: unknown[];
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

    const systemPromptValue = systemPrompt.value;

    const systemPromptParts: Part[] = [{ text: message }];

    const conversationHistory =
      await this.discordHumanConversationHistoryService.getChannelHistory(
        channelId,
      );

    await this.discordHumanConversationHistoryService.addChannelHistory(
      channelId,
      {
        role: 'user',
        text: message,
      },
    );

    const conversationHistoryContents = conversationHistory.map((message) =>
      DiscordHumanConversationHistoryMessageConverter.toGeminiContent(message),
    );

    const generationResult = await this.geminiService.generateContent({
      systemPrompt: systemPromptValue,
      queryParts: systemPromptParts,
      conversationHistory: conversationHistoryContents,
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

    await this.discordHumanConversationHistoryService.addChannelHistory(
      channelId,
      {
        role: 'model',
        text: generationResultValue,
      },
    );

    return MarkdownHelper.splitMessageWithCodeAndPagination({
      text: generationResultValue,
      maxPageLength: 1800,
    });
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
