import { DISCORD_BOT_CONFIG } from '@Modules/discord_bot/discord-bot.config';
import { Client, EmbedBuilder } from 'discord.js';

export class EmbedBuilderService {
  static simpleError({
    message = 'Something went wrong.',
    title = 'Error',
    client,
  }: {
    message?: string;
    title?: string;
    client: Client;
  }): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(DISCORD_BOT_CONFIG.colors.error)
      .setTitle(title)
      .setDescription(message)
      .setTimestamp()
      .setFooter(this.generateFooter(client));
  }

  static simpleSuccess({
    message,
    title = 'Success',
    client,
  }: {
    message: string;
    title?: string;
    client: Client;
  }): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(DISCORD_BOT_CONFIG.colors.success)
      .setTitle(title)
      .setDescription(message)
      .setTimestamp()
      .setFooter(this.generateFooter(client));
  }

  static simpleInfo({
    message,
    title = 'Info',
    client,
  }: {
    message: string;
    title?: string;
    client: Client;
  }): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(DISCORD_BOT_CONFIG.colors.info)
      .setTitle(title)
      .setDescription(message)
      .setTimestamp()
      .setFooter(this.generateFooter(client));
  }

  private static generateFooter(client: Client): {
    text: string;
    iconURL: string | undefined;
  } {
    const { user } = client;

    return {
      text: `${user?.displayName ?? DISCORD_BOT_CONFIG.botName} v${process.env.npm_package_version}`,
      iconURL: user?.displayAvatarURL() ?? undefined,
    };
  }
}
