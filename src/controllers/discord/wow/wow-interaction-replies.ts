import {
  ButtonInteraction,
  ChatInputCommandInteraction,
  MessageFlags,
  StringSelectMenuInteraction,
} from 'discord.js';
import {
  WowFlowContext,
  WowFlowReply,
  WowInteractionService,
} from '@Services/wow/wow-interaction.service';

export function wowFlowContext(interaction: {
  guildId: string | null;
  channelId: string;
  user: { id: string };
}): WowFlowContext {
  return {
    guildId: interaction.guildId ?? '',
    channelId: interaction.channelId,
    userId: interaction.user.id,
  };
}

export async function replyWowFlow(
  flows: WowInteractionService,
  interaction: ChatInputCommandInteraction,
  action: () => Promise<WowFlowReply>,
  ephemeral = true,
): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({
      content: 'Use this command in a Discord server.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  await interaction.deferReply({
    flags: ephemeral ? MessageFlags.Ephemeral : undefined,
  });
  await interaction.editReply({
    ...(await flows.execute(action)),
    allowedMentions: { parse: [] },
  });
}

export async function updateWowFlow(
  flows: WowInteractionService,
  interaction: ButtonInteraction | StringSelectMenuInteraction,
  token: string,
  action: () => Promise<WowFlowReply>,
): Promise<void> {
  try {
    await flows.authorize(token, wowFlowContext(interaction));
  } catch (error) {
    const reply = await flows.execute(() =>
      Promise.reject(
        error instanceof Error
          ? error
          : new Error('Interaction authorization failed.'),
      ),
    );
    await interaction.reply({
      ...reply,
      flags: MessageFlags.Ephemeral,
      allowedMentions: { parse: [] },
    });
    return;
  }
  await interaction.deferUpdate();
  await interaction.editReply({
    ...(await flows.execute(action)),
    allowedMentions: { parse: [] },
  });
}
