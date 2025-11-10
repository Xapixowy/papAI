import { Logger } from '@nestjs/common';
import { TextChannel } from 'discord.js';

const logger = new Logger('startTypingInterval');

export const startTypingInterval = (
  channel: TextChannel,
  refreshIntervalMs = 8000,
): (() => void) | null => {
  let typingInterval: NodeJS.Timeout | null = null;

  const stop = () => {
    if (typingInterval) {
      clearInterval(typingInterval);
      typingInterval = null;
    }
  };

  const sendOrStop = () => {
    if (!typingInterval) return;

    channel.sendTyping().catch((error) => {
      logger.warn(
        `Failed to send/refresh typing indicator for channel ${channel.id}. Stopping interval.`,
        error,
      );
      stop();
    });
  };

  typingInterval = setInterval(sendOrStop, refreshIntervalMs);

  sendOrStop();

  return stop;
};
