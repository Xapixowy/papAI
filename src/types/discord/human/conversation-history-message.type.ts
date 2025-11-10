import { DiscordAttachment } from '@Types/discord/discord-attachment.type';

export type DiscordHumanConversationHistoryMessage = {
  role: 'user' | 'model';
  text: string;
  attachments?: DiscordAttachment[];
  messageId?: string;
  createdAt: string;
};
