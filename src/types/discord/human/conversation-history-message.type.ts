export type DiscordHumanConversationHistoryMessage = {
  role: 'user' | 'model';
  text: string;
  messageId?: string;
  createdAt: string;
};
