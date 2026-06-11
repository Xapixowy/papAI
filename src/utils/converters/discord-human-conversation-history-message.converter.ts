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
    const date = new Date(message.createdAt);
    const timestamp = date.toISOString().replace('T', ' ').substring(0, 16);
    const prefix =
      message.role === 'user'
        ? `[${timestamp} UTC]${message.authorDisplayName ? ` [${message.authorDisplayName}${message.authorId ? ` <@${message.authorId}>` : ''}]` : ''}:`
        : '';
    const textPart = {
      text: prefix ? `${prefix} ${message.text}` : message.text,
    };
    const imageParts = (message.attachments ?? []).map((attachment) => ({
      inlineData: {
        mimeType: attachment.contentType,
        data: attachment.data,
      },
    }));

    return {
      role: message.role === 'user' ? 'user' : 'model',
      parts: [textPart, ...imageParts],
    };
  }
}
