import {
  ChatInputCommandInteraction,
  StringSelectMenuInteraction,
} from 'discord.js';
import { SlashCommandContext, StringSelectContext } from 'necord';

export const getDiscordInteractionFromArgs = (
  args: any[] = [],
): ChatInputCommandInteraction | StringSelectMenuInteraction | null => {
  if (!args.length) {
    return null;
  }

  const commandContext = args[0] as SlashCommandContext | StringSelectContext;

  const interaction = commandContext.find(
    (arg) =>
      arg instanceof ChatInputCommandInteraction ||
      arg instanceof StringSelectMenuInteraction,
  );

  return interaction ?? null;
};
