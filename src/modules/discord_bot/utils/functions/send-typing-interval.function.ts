import { TextChannel } from 'discord.js';

export const startTypingInterval = (
  channel: TextChannel,
  refreshIntervalMs = 8000,
): (() => void) | null => {
  let typingInterval: NodeJS.Timeout | null = null;

  channel.sendTyping();
  typingInterval = setInterval(() => {
    // Sprawdź ponownie, czy kanał istnieje i jest TextChannel przed wysłaniem
    if (channel && !channel.deletable) {
      channel.sendTyping().catch(() => {
        if (typingInterval) clearInterval(typingInterval);
      });
    } else {
      if (typingInterval) clearInterval(typingInterval);
    }
  }, refreshIntervalMs);

  return () => {
    if (typingInterval) {
      clearInterval(typingInterval);
      typingInterval = null;
    }
  };
};
