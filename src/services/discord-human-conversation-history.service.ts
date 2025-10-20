import { ProviderToken } from '@Enums/provider-token.enum';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { DiscordHumanConversationHistoryMessage } from '@Types/discord/human/conversation-history-message.type';
import Redis from 'ioredis';

@Injectable()
export class DiscordHumanConversationHistoryService {
  private readonly logger = new Logger(
    DiscordHumanConversationHistoryService.name,
  );
  private readonly historyKeyPrefix = 'human:discord:channel:history';
  private readonly historyMessagesCount: number = 20;

  constructor(@Inject(ProviderToken.REDIS) private readonly redis: Redis) {}

  private getChannelHistoryKey(channelId: string): string {
    return `${this.historyKeyPrefix}:${channelId}`;
  }

  async getChannelHistory(
    channelId: string,
  ): Promise<DiscordHumanConversationHistoryMessage[]> {
    const key = this.getChannelHistoryKey(channelId);

    try {
      const historyJson = await this.redis.lrange(key, 0, -1);

      if (!historyJson || historyJson.length === 0) {
        return [];
      }

      const messages: DiscordHumanConversationHistoryMessage[] = historyJson
        .reverse()
        .map((messageJson) => {
          const message = JSON.parse(
            messageJson,
          ) as DiscordHumanConversationHistoryMessage;
          return {
            role: message.role,
            text: message.text,
          };
        });

      return messages;
    } catch (error) {
      this.logger.error(
        `Error getting channel history for channel ${channelId}:`,
        error,
      );
      return [];
    }
  }

  async addChannelHistory(
    channelId: string,
    message: DiscordHumanConversationHistoryMessage,
  ): Promise<void> {
    const key = this.getChannelHistoryKey(channelId);

    if (!message.text) {
      return;
    }

    try {
      await this.redis.lpush(key, JSON.stringify(message));
      await this.redis.ltrim(key, 0, this.historyMessagesCount - 1);
      await this.redis.expire(key, 3600);
    } catch (error) {
      this.logger.error(
        `Error adding channel history for channel ${channelId}:`,
        error,
      );
    }
  }
}
