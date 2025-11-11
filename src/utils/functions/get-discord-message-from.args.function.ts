import { Message } from 'discord.js';

export const getDiscordMessageFromArgs = (args: any[] = []): Message | null => {
  if (!args.length) {
    return null;
  }

  const context = args[0] as any[];

  const message = context.find((arg) => arg instanceof Message);

  return message ?? null;
};
