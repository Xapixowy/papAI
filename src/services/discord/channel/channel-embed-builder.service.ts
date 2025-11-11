import { GUILD_COMMANDS_CONFIG } from '@Constants/discord/guild-commands.constant';
import { DiscordChannelDto } from '@DTOs/discord-channel.dto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, EmbedBuilder } from 'discord.js';
import { EmbedBuilderService } from '../embed-builder.service';

@Injectable()
export class ChannelEmbedBuilderService extends EmbedBuilderService {
  constructor(
    protected readonly client: Client,
    protected readonly configService: ConfigService,
  ) {
    super(client, configService);
  }

  channelConfigList({
    description,
    channels,
  }: {
    description: string;
    channels: DiscordChannelDto[];
  }): EmbedBuilder {
    const channelConfigsSection = this.generateChannelConfigsSection({
      channels,
    });

    return this.simple({
      description: `${description}\n${channelConfigsSection}`,
      thumbnail: GUILD_COMMANDS_CONFIG.embed.thumbnail,
      title: GUILD_COMMANDS_CONFIG.embed.title,
      variant: 'info',
    });
  }

  private generateChannelConfigsSection({
    channels,
  }: {
    channels: DiscordChannelDto[];
  }): string {
    const channelConfigsWithFeatures = channels.map((channelConfig) => {
      const features = Object.keys(channelConfig.features).map(
        (feature) =>
          `  - \`${channelConfig.features[feature] ? '✅' : '❌'} ${feature}\``,
      );
      return `- \`💬 ${channelConfig.name} | ${channelConfig.id}\`\n${features.join('\n')}`;
    });

    return this.generateSection({
      title: '`💬` Channel Configs',
      description: channelConfigsWithFeatures.length
        ? channelConfigsWithFeatures
        : ['There are no channel configs.'],
    });
  }
}
