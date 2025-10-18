import appConfig from '@Configs/app.config';
import { DISCORD_BOT_CONFIG } from '@Modules/discord_bot/discord-bot.config';
import { Inject } from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import { Client, EmbedBuilder } from 'discord.js';
import { EmbedVariant } from '../types/embed-variant.type';

export class EmbedBuilderService {
  constructor(
    private readonly client: Client,
    @Inject(appConfig.KEY)
    private readonly config: ConfigType<typeof appConfig>,
  ) {}

  simple({
    description,
    title,
    thumbnail,
    variant,
  }: {
    description: string;
    title?: string;
    thumbnail?: string;
    variant: EmbedVariant;
  }): EmbedBuilder {
    switch (variant) {
      case 'success':
        return this.simpleSuccess({
          description,
          title,
          thumbnail,
        });
      case 'error':
        return this.simpleError({
          description,
          title,
          thumbnail,
        });
      case 'warning':
        return this.simpleWarning({
          description,
          title,
          thumbnail,
        });
      case 'info':
      default:
        return this.simpleInfo({
          description,
          title,
          thumbnail,
        });
    }
  }

  generateSection({
    title,
    description,
  }: {
    title: string;
    description: string[];
  }): string {
    return `### ${title}\n${description.join('\n')}`;
  }

  private simpleInfo({
    description,
    title = 'Info',
    thumbnail,
  }: {
    description: string;
    title?: string;
    thumbnail?: string;
  }): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(DISCORD_BOT_CONFIG.colors.info)
      .setTitle(title)
      .setDescription(description)
      .setTimestamp()
      .setThumbnail(thumbnail ?? null)
      .setFooter(this.generateFooter());
  }

  private simpleSuccess({
    description,
    title = 'Success',
    thumbnail,
  }: {
    description: string;
    title?: string;
    thumbnail?: string;
  }): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(DISCORD_BOT_CONFIG.colors.success)
      .setTitle(title)
      .setDescription(description)
      .setTimestamp()
      .setThumbnail(thumbnail ?? null)
      .setFooter(this.generateFooter());
  }

  private simpleError({
    description = 'Something went wrong.',
    title = 'Error',
    thumbnail,
  }: {
    description?: string;
    title?: string;
    thumbnail?: string;
  }): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(DISCORD_BOT_CONFIG.colors.error)
      .setTitle(title)
      .setDescription(description)
      .setTimestamp()
      .setThumbnail(thumbnail ?? null)
      .setFooter(this.generateFooter());
  }

  private simpleWarning({
    description = 'Something went wrong.',
    title = 'Warning',
    thumbnail,
  }: {
    description?: string;
    title?: string;
    thumbnail?: string;
  }): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(DISCORD_BOT_CONFIG.colors.warning)
      .setTitle(title)
      .setDescription(description)
      .setTimestamp()
      .setThumbnail(thumbnail ?? null)
      .setFooter(this.generateFooter());
  }

  private generateFooter(): {
    text: string;
    iconURL: string | undefined;
  } {
    const { user } = this.client;
    const version = this.config.version;

    return {
      text:
        `${user?.displayName ?? DISCORD_BOT_CONFIG.botName}` +
        (version ? ` v${version}` : ''),
      iconURL: user?.displayAvatarURL() ?? undefined,
    };
  }
}
