import {
  ButtonInteraction,
  ChatInputCommandInteraction,
  StringSelectMenuInteraction,
} from 'discord.js';
import {
  ButtonContext,
  SlashCommandContext,
  StringSelectContext,
} from 'necord';

export const getDiscordInteractionFromArgs = (
  args: any[] = [],
):
  | ChatInputCommandInteraction
  | StringSelectMenuInteraction
  | ButtonInteraction
  | null => {
  if (!args.length) {
    return null;
  }

  const commandContext = args[0] as
    | SlashCommandContext
    | StringSelectContext
    | ButtonContext;

  const interaction = commandContext.find(
    (arg) =>
      arg instanceof ChatInputCommandInteraction ||
      arg instanceof StringSelectMenuInteraction ||
      arg instanceof ButtonInteraction,
  );

  return interaction ?? null;
};
