import { ConfigService } from '@nestjs/config';
import { Client, ColorResolvable, EmbedBuilder } from 'discord.js';
import { EmbedVariant } from '../types/embed-variant.type';

export class EmbedBuilderService {
  constructor(
    private readonly client: Client,
    private readonly configService: ConfigService,
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
    const color = this.configService.get<ColorResolvable>(
      'discord.colors.info',
    )!;

    return new EmbedBuilder()
      .setColor(color)
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
    const color = this.configService.get<ColorResolvable>(
      'discord.colors.success',
    )!;

    return new EmbedBuilder()
      .setColor(color)
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
    const color = this.configService.get<ColorResolvable>(
      'discord.colors.error',
    )!;

    return new EmbedBuilder()
      .setColor(color)
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
    const color = this.configService.get<ColorResolvable>(
      'discord.colors.warning',
    )!;

    return new EmbedBuilder()
      .setColor(color)
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
    const version = this.configService.get<string>('app.version')!;
    const botName = this.configService.get<string>('discord.botName')!;

    return {
      text: `${user?.displayName ?? botName}` + (version ? ` v${version}` : ''),
      iconURL: user?.displayAvatarURL() ?? undefined,
    };
  }
}
