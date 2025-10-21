import { Content } from '@google/generative-ai';
import { DiscordHumanConversationHistoryMessage } from '@Types/discord/human/conversation-history-message.type';

export class DiscordHumanConversationHistoryMessageConverter {
  static fromGeminiContent(
    content: Content,
  ): DiscordHumanConversationHistoryMessage {
    return {
      role: content.role === 'user' ? 'user' : 'model',
      text: content.parts.find((part) => 'text' in part)?.text ?? '',
      createdAt: new Date().toISOString(),
    };
  }

  static toGeminiContent(
    message: DiscordHumanConversationHistoryMessage,
  ): Content {
    return {
      role: message.role === 'user' ? 'user' : 'model',
      parts: [{ text: message.text }],
    };
  }
}
