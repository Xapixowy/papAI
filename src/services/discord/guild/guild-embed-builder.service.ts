import { GUILD_COMMANDS_CONFIG } from '@Constants/discord/guild-commands.constant';
import { DiscordGuildDto } from '@DTOs/discord-guild.dto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, EmbedBuilder } from 'discord.js';
import { EmbedBuilderService } from '../embed-builder.service';

@Injectable()
export class GuildEmbedBuilderService extends EmbedBuilderService {
  constructor(
    protected readonly client: Client,
    protected readonly configService: ConfigService,
  ) {
    super(client, configService);
  }

  guildConfigList({
    description,
    guildConfigs,
  }: {
    description: string;
    guildConfigs: DiscordGuildDto[];
  }): EmbedBuilder {
    const guildConfigsSection = this.generateGuildConfigsSection({
      guildConfigs,
    });

    return this.simple({
      description: `${description}\n${guildConfigsSection}`,
      thumbnail: GUILD_COMMANDS_CONFIG.embed.thumbnail,
      title: GUILD_COMMANDS_CONFIG.embed.title,
      variant: 'info',
    });
  }

  private generateGuildConfigsSection({
    guildConfigs,
  }: {
    guildConfigs: DiscordGuildDto[];
  }): string {
    const guildConfigsWithFeatures = guildConfigs.map((guildConfig) => {
      const features = guildConfig.features.map(
        (feature) => `  - \`${feature}\``,
      );
      return `- \`🌐 ${guildConfig.name} | ${guildConfig.id}\`\n${features.join('\n')}`;
    });

    return this.generateSection({
      title: '`👥` Guild Configs',
      description: guildConfigsWithFeatures.length
        ? guildConfigsWithFeatures
        : ['There are no guild configs.'],
    });
  }
}
