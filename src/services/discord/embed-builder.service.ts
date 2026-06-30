import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, ColorResolvable, EmbedBuilder } from 'discord.js';
import { EmbedVariant } from '../../types/discord/embed-variant.type';

const EMBED_DESCRIPTION_MAX = 4096;
const EMBED_COUNT_MAX = 10;

@Injectable()
export class EmbedBuilderService {
  constructor(
    protected readonly client: Client,
    protected readonly configService: ConfigService,
  ) {}

  simple({
    description,
    title,
    thumbnail,
    variant,
    logger,
  }: {
    description: string;
    title?: string;
    thumbnail?: string;
    variant: EmbedVariant;
    logger?: Logger;
  }): EmbedBuilder[] {
    if (logger && variant === 'error') {
      logger.error(description);
    }

    const chunks = this.chunkDescription(description);
    return chunks.slice(0, EMBED_COUNT_MAX).map((chunk, i) =>
      this.buildSingleEmbed({
        description: chunk,
        title: i === 0 ? title : undefined,
        thumbnail: i === 0 ? thumbnail : undefined,
        variant,
      }),
    );
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

  protected chunkDescription(
    description: string,
    maxChars = EMBED_DESCRIPTION_MAX,
  ): string[] {
    if (description.length <= maxChars) return [description];

    const chunks: string[] = [];
    const lines = description.split('\n');
    let current = '';

    for (const line of lines) {
      const addition = current ? '\n' + line : line;
      if (current.length + addition.length > maxChars) {
        if (current) chunks.push(current);
        current = line.length > maxChars ? line.slice(0, maxChars) : line;
      } else {
        current += addition;
      }
    }

    if (current) chunks.push(current);
    return chunks;
  }

  private buildSingleEmbed({
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
    const colorKey = {
      success: 'discord.colors.success',
      error: 'discord.colors.error',
      warning: 'discord.colors.warning',
      info: 'discord.colors.info',
    }[variant];

    const defaultTitle = {
      success: 'Success',
      error: 'Error',
      warning: 'Warning',
      info: 'Info',
    }[variant];

    const color = this.configService.get<ColorResolvable>(colorKey)!;

    return new EmbedBuilder()
      .setColor(color)
      .setTitle(title ?? defaultTitle)
      .setDescription(description)
      .setTimestamp()
      .setThumbnail(thumbnail ?? null)
      .setFooter(this.generateFooter());
  }

  protected generateFooter(): {
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
