import { DiscordAttachment } from '@Modules/discord_bot/types/discord-attachment.type';

export type DiscordHumanConversationHistoryMessage = {
  role: 'user' | 'model';
  text: string;
  attachments?: DiscordAttachment[];
  messageId?: string;
  createdAt: string;
};
