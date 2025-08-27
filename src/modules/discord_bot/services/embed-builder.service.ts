import { EnvKey } from '@Enums/env-key.enum';
import { DISCORD_BOT_CONFIG } from '@Modules/discord_bot/discord-bot.config';
import { Client, EmbedBuilder } from 'discord.js';
import { EmbedVariant } from '../types/embed-variant.type';

export class EmbedBuilderService {
  static simple({
    description,
    title,
    thumbnail,
    variant,
    client,
  }: {
    description: string;
    title?: string;
    thumbnail?: string;
    variant: EmbedVariant;
    client: Client;
  }): EmbedBuilder {
    switch (variant) {
      case 'success':
        return EmbedBuilderService.simpleSuccess({
          description,
          title,
          thumbnail,
          client,
        });
      case 'error':
        return EmbedBuilderService.simpleError({
          description,
          title,
          thumbnail,
          client,
        });
      case 'warning':
        return EmbedBuilderService.simpleWarning({
          description,
          title,
          thumbnail,
          client,
        });
      case 'info':
      default:
        return EmbedBuilderService.simpleInfo({
          description,
          title,
          thumbnail,
          client,
        });
    }
  }

  static generateSection({
    title,
    description,
  }: {
    title: string;
    description: string[];
  }): string {
    return `### ${title}\n${description.join('\n')}`;
  }

  private static simpleInfo({
    description,
    title = 'Info',
    thumbnail,
    client,
  }: {
    description: string;
    title?: string;
    thumbnail?: string;
    client: Client;
  }): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(DISCORD_BOT_CONFIG.colors.info)
      .setTitle(title)
      .setDescription(description)
      .setTimestamp()
      .setThumbnail(thumbnail ?? null)
      .setFooter(this.generateFooter(client));
  }

  private static simpleSuccess({
    description,
    title = 'Success',
    thumbnail,
    client,
  }: {
    description: string;
    title?: string;
    thumbnail?: string;
    client: Client;
  }): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(DISCORD_BOT_CONFIG.colors.success)
      .setTitle(title)
      .setDescription(description)
      .setTimestamp()
      .setThumbnail(thumbnail ?? null)
      .setFooter(this.generateFooter(client));
  }

  private static simpleError({
    description = 'Something went wrong.',
    title = 'Error',
    thumbnail,
    client,
  }: {
    description?: string;
    title?: string;
    thumbnail?: string;
    client: Client;
  }): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(DISCORD_BOT_CONFIG.colors.error)
      .setTitle(title)
      .setDescription(description)
      .setTimestamp()
      .setThumbnail(thumbnail ?? null)
      .setFooter(this.generateFooter(client));
  }

  private static simpleWarning({
    description = 'Something went wrong.',
    title = 'Warning',
    thumbnail,
    client,
  }: {
    description?: string;
    title?: string;
    thumbnail?: string;
    client: Client;
  }): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(DISCORD_BOT_CONFIG.colors.warning)
      .setTitle(title)
      .setDescription(description)
      .setTimestamp()
      .setThumbnail(thumbnail ?? null)
      .setFooter(this.generateFooter(client));
  }

  private static generateFooter(client: Client): {
    text: string;
    iconURL: string | undefined;
  } {
    const { user } = client;
    const version = process.env[EnvKey.APP_VERSION];

    return {
      text:
        `${user?.displayName ?? DISCORD_BOT_CONFIG.botName}` +
        (version ? ` v${version}` : ''),
      iconURL: user?.displayAvatarURL() ?? undefined,
    };
  }
}
