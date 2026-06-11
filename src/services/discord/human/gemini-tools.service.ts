import { ErrorCode } from '@Enums/error-code.enum';
import { Content, InlineDataPart, Part } from '@google/generative-ai';
import { Injectable, Logger } from '@nestjs/common';
import { DiscordMessageService } from '@Services/discord-message.service';
import { DiscordUsersService } from '@Services/discord-users.service';
import { DiscordHumanConversationHistoryMessage } from '@Types/discord/human/conversation-history-message.type';
import { DiscordHumanConversationHistoryMessageConverter } from '@Utils/converters/discord-human-conversation-history-message.converter';
import { DiscordAttachmentsHelper } from '@Utils/helpers/discord-attachments.helper';
import { Client, TextChannel } from 'discord.js';
import { Result, err, ok } from 'neverthrow';

export interface SearchSavedMessagesArgs {
  keyword?: string;
  author_name?: string;
  channel_id?: string;
  date_from?: string;
  date_to?: string;
  has_attachments?: boolean;
  limit?: number;
}

@Injectable()
export class HumanGeminiToolsService {
  private readonly logger = new Logger(HumanGeminiToolsService.name);

  constructor(
    private readonly client: Client,
    private readonly discordMessageService: DiscordMessageService,
    private readonly discordUsersService: DiscordUsersService,
  ) {}

  async handleGetConversationHistory({
    channelId,
    messageId,
    limit,
  }: {
    channelId: string;
    messageId: string;
    limit: number;
  }): Promise<Content[]> {
    const messages = await this.fetchChannelMessages(
      channelId,
      messageId,
      limit,
    );

    const filtered = messages
      .match(
        (msgs) => msgs,
        () => [] as DiscordHumanConversationHistoryMessage[],
      )
      .filter((msg) => !msg.messageId || msg.messageId !== messageId)
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );

    return filtered.map((msg) =>
      DiscordHumanConversationHistoryMessageConverter.toGeminiContent(msg),
    );
  }

  async handleSearchSavedMessages(
    args: SearchSavedMessagesArgs & { guildId: string },
  ): Promise<object> {
    const {
      guildId,
      keyword,
      author_name,
      channel_id,
      date_from,
      date_to,
      has_attachments,
      limit,
    } = args;

    let userIds: string[] | undefined;
    if (author_name) {
      const mentionMatch = author_name.match(/^<@!?(\d+)>$/);
      if (mentionMatch) {
        userIds = [mentionMatch[1]];
      } else {
        const guild = this.client.guilds.cache.get(guildId);
        const needle = author_name.toLowerCase();

        const cachedMemberIds = guild
          ? guild.members.cache
              .filter(
                (m) =>
                  m.displayName.toLowerCase().includes(needle) ||
                  (m.nickname?.toLowerCase().includes(needle) ?? false) ||
                  m.user.username.toLowerCase().includes(needle),
              )
              .map((m) => m.id)
          : [];

        if (cachedMemberIds.length > 0) {
          userIds = cachedMemberIds;
        } else {
          const matchedUsers =
            await this.discordUsersService.findByUsernamePartial(author_name);
          userIds = matchedUsers.map((u) => u.id);
        }
      }
    }

    const guild = this.client.guilds.cache.get(guildId);
    const rawChannelId = channel_id?.match(/^<#(\d+)>$/)?.[1] ?? channel_id;
    let resolvedChannelId: string | undefined;
    if (rawChannelId && guild) {
      if (guild.channels.cache.has(rawChannelId)) {
        resolvedChannelId = rawChannelId;
      } else {
        const byName = guild.channels.cache.find((c) =>
          c.name.toLowerCase().includes(rawChannelId.toLowerCase()),
        );
        resolvedChannelId = byName?.id;
      }
    }

    const results = await this.discordMessageService.search({
      guildId,
      keyword,
      userIds,
      channelId: resolvedChannelId,
      dateFrom: date_from ? new Date(date_from) : undefined,
      dateTo: date_to ? new Date(date_to) : undefined,
      hasAttachments: has_attachments,
      limit: Math.min(limit ?? 20, 50),
    });

    const allUserIds = [...new Set(results.map((r) => r.discordUserId))];
    const users = await this.discordUsersService.findByUserIds(allUserIds);
    const usernameMap = new Map(users.map((u) => [u.id, u.username]));

    const formatted = results.map((r) => ({
      message: r.message,
      author: usernameMap.get(r.discordUserId) ?? r.discordUserId,
      channel_id: r.discordChannelId,
      date: r.createdAt.toISOString(),
      has_attachments: (r.attachments?.length ?? 0) > 0,
      attachment_urls: r.attachments ?? [],
    }));

    return {
      results: formatted,
      total: formatted.length,
      note: 'Only messages from channels with HUMAN_SAVE_MESSAGES feature enabled are searchable.',
    };
  }

  private async fetchChannelMessages(
    channelId: string,
    messageId: string,
    limit: number,
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
        const attachments = message.attachments.map((a) => a);
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

        const allImageParts: Part[] = [
          ...imagesAttachmentsParts,
          ...embedImageParts,
        ];

        const isBot = message.author.id === this.client.user?.id;
        const authorDisplayName = isBot
          ? undefined
          : (message.member?.displayName ??
            message.author.displayName ??
            message.author.username);
        const authorId = isBot ? undefined : message.author.id;

        convertedMessages.push({
          role: isBot ? 'model' : 'user',
          text: message.content,
          authorDisplayName,
          authorId,
          attachments: allImageParts.map((part) => {
            const inlinePart = part as InlineDataPart;
            return {
              contentType: inlinePart.inlineData.mimeType,
              data: inlinePart.inlineData.data,
            };
          }),
          createdAt: message.createdAt.toISOString(),
          messageId: message.id,
        });
      }

      return ok(convertedMessages);
    } catch {
      return err(ErrorCode.DISCORD_CHANNEL_NOT_FOUND);
    }
  }
}
