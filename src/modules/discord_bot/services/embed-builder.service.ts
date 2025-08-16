import { DISCORD_BOT_CONFIG } from '@Modules/discord_bot/discord-bot.config';
import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';

export class EmbedBuilderService {
  static simpleError({
    message = 'Something went wrong.',
    title = 'Error',
    interaction,
  }: {
    message?: string;
    title?: string;
    interaction: ChatInputCommandInteraction;
  }): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(DISCORD_BOT_CONFIG.colors.error)
      .setTitle(title)
      .setDescription(message)
      .setTimestamp()
      .setFooter(this.generateFooter(interaction));
  }

  static simpleSuccess({
    message,
    title = 'Success',
    interaction,
  }: {
    message: string;
    title?: string;
    interaction: ChatInputCommandInteraction;
  }): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(DISCORD_BOT_CONFIG.colors.success)
      .setTitle(title)
      .setDescription(message)
      .setTimestamp()
      .setFooter(this.generateFooter(interaction));
  }

  private static generateFooter(interaction: ChatInputCommandInteraction): {
    text: string;
    iconURL: string;
  } {
    return {
      text: `${DISCORD_BOT_CONFIG.botName} v${process.env.npm_package_version}`,
      iconURL: interaction?.client.user.displayAvatarURL() ?? undefined,
    };
  }
}
