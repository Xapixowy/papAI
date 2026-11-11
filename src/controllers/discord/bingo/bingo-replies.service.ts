import { Injectable } from '@nestjs/common';
import { EmbedBuilder, MessageFlags } from 'discord.js';
import type {
  ButtonInteraction,
  ChatInputCommandInteraction,
  InteractionEditReplyOptions,
  StringSelectMenuInteraction,
} from 'discord.js';
import { BingoDiscordService } from '@Services/bingo/bingo-discord.service';
import type { BingoActor } from '@Services/bingo/bingo-store.service';
import { BingoError } from '@Services/bingo/bingo-rules';

export type BingoInteraction =
  ChatInputCommandInteraction | ButtonInteraction | StringSelectMenuInteraction;

@Injectable()
export class BingoRepliesService {
  constructor(private readonly discord: BingoDiscordService) {}

  async run(
    interaction: BingoInteraction,
    action: (
      actor: BingoActor,
    ) => Promise<string | InteractionEditReplyOptions>,
  ): Promise<void> {
    const context = {
      guild: interaction.guildId,
      channel: interaction.channelId,
      user: interaction.user.id,
    };
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const actor = await this.discord.actor(interaction);
      const result = await action(actor);
      await interaction.editReply(
        typeof result === 'string'
          ? this.text(result)
          : { ...result, allowedMentions: { parse: [] } },
      );
    } catch (error) {
      this.discord.logFailure(
        interaction.isChatInputCommand()
          ? interaction.commandName +
              ' ' +
              interaction.options.getSubcommandGroup(false) +
              ' ' +
              interaction.options.getSubcommand(false)
          : interaction.customId.split('/').slice(0, 2).join('/'),
        context,
        error,
      );
      const payload = this.text(
        error instanceof BingoError
          ? error.message
          : 'Bingo could not complete this action. Please try again. The error has been logged.',
      );
      try {
        if (interaction.deferred || interaction.replied)
          await interaction.editReply(payload);
        else
          await interaction.reply({
            ...payload,
            flags: MessageFlags.Ephemeral,
          });
      } catch (replyError) {
        this.discord.logFailure('error-reply', context, replyError);
      }
    }
  }

  async update(
    interaction: ButtonInteraction | StringSelectMenuInteraction,
    action: (actor: BingoActor) => Promise<InteractionEditReplyOptions>,
  ): Promise<void> {
    const context = {
      guild: interaction.guildId,
      channel: interaction.channelId,
      user: interaction.user.id,
    };
    try {
      await interaction.deferUpdate();
      const actor = await this.discord.actor(interaction);
      await interaction.editReply({
        ...(await action(actor)),
        allowedMentions: { parse: [] },
      });
    } catch (error) {
      this.discord.logFailure('selection', context, error);
      const message =
        error instanceof BingoError
          ? error.message
          : 'Bingo could not complete this selection. Please try again. The error has been logged.';
      try {
        await interaction.followUp({
          ...this.text(message),
          flags: MessageFlags.Ephemeral,
        });
      } catch (replyError) {
        this.discord.logFailure('selection-error-reply', context, replyError);
      }
    }
  }

  text(description: string) {
    return {
      embeds: [
        new EmbedBuilder()
          .setTitle('Bingo')
          .setDescription(description)
          .setColor(0x69ddb0),
      ],
      components: [],
      allowedMentions: { parse: [] },
    };
  }
}
