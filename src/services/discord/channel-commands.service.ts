import { CHANNEL_FEATURE_DEFAULTS } from '@Constants/discord-guild-config.constant';
import { CHANNEL_COMMANDS_CONFIG } from '@Constants/discord/channel-commands.constant';
import { ERROR_CODE_MESSAGE_MAP } from '@Constants/error-messages.constant';
import { DiscordChannelDto } from '@DTOs/discord-channel.dto';
import { DiscordSelectId } from '@Enums/discord/discord-select-id.enum';
import { Injectable, Logger } from '@nestjs/common';
import { DiscordChannelService } from '@Services/discord-channel.service';
import { EmbedVariant } from '@Types/discord/embed-variant.type';
import {
  ActionRowBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
} from 'discord.js';
import { ChannelEmbedBuilderService } from './channel/channel-embed-builder.service';

@Injectable()
export class ChannelCommandsService {
  private readonly logger = new Logger(this.constructor.name);

  constructor(
    private readonly embedBuilderService: ChannelEmbedBuilderService,
    private readonly discordChannelService: DiscordChannelService,
  ) {}

  async addHandler({
    channelId,
    channelName,
    guildId,
  }: {
    channelId: string;
    channelName: string;
    guildId: string;
  }): Promise<EmbedBuilder> {
    const channel = await this.discordChannelService.findById(channelId);

    if (!channel.isErr() && channel.value) {
      return this.generateSimpleEmbed({
        description: 'Channel already exists.',
        variant: 'error',
      });
    }

    const newChannel = new DiscordChannelDto({
      id: channelId,
      name: channelName,
      discordGuildId: guildId,
      features: CHANNEL_FEATURE_DEFAULTS,
    });

    const createdChannel = await this.discordChannelService.create(newChannel);

    if (createdChannel.isErr()) {
      return this.generateSimpleEmbed({
        description: ERROR_CODE_MESSAGE_MAP[createdChannel.error],
        variant: 'error',
      });
    }

    return this.generateSimpleEmbed({
      description: 'Channel initialized.',
      variant: 'success',
    });
  }

  async removeHandler(guildId: string): Promise<{
    embed: EmbedBuilder;
    component?: ActionRowBuilder<StringSelectMenuBuilder>;
  }> {
    const channels = await this.discordChannelService.findAllByGuildId(guildId);

    if (channels.isErr()) {
      return {
        embed: this.generateSimpleEmbed({
          description: ERROR_CODE_MESSAGE_MAP[channels.error],
          variant: 'error',
        }),
      };
    }

    const channelsValue = channels.value;

    if (channelsValue.length === 0) {
      return {
        embed: this.generateSimpleEmbed({
          description: 'There are no channels.',
          variant: 'error',
        }),
      };
    }

    const channelOptions = channelsValue.map((c, i) => ({
      label: `Channel #${channelsValue.length - i}`,
      value: c.id,
      description: `💬 ${c.name} | ${c.id}`,
    }));

    const channelsSelectMenu = new StringSelectMenuBuilder()
      .setCustomId(DiscordSelectId.CHANNELS_TO_REMOVE)
      .setPlaceholder('Select a channel to remove')
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(channelOptions);

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      channelsSelectMenu,
    );

    return {
      embed: this.generateSimpleEmbed({
        description: 'Select a channel to remove.',
        variant: 'info',
      }),
      component: row,
    };
  }

  async removeSelectHandler(channelId: string): Promise<EmbedBuilder> {
    const channel = await this.discordChannelService.findById(channelId);

    if (channel.isErr()) {
      return this.generateSimpleEmbed({
        description: ERROR_CODE_MESSAGE_MAP[channel.error],
        variant: 'error',
      });
    }

    const removedChannel =
      await this.discordChannelService.deleteById(channelId);

    if (removedChannel.isErr()) {
      return this.generateSimpleEmbed({
        description: ERROR_CODE_MESSAGE_MAP[removedChannel.error],
        variant: 'error',
      });
    }

    return this.generateSimpleEmbed({
      description: 'Channel removed.',
      variant: 'success',
    });
  }

  async listHandler(guildId: string): Promise<EmbedBuilder> {
    const channels = await this.discordChannelService.findAllByGuildId(guildId);

    if (channels.isErr()) {
      return this.generateSimpleEmbed({
        description: ERROR_CODE_MESSAGE_MAP[channels.error],
        variant: 'error',
      });
    }

    const channelsValue = channels.value;

    if (channelsValue.length === 0) {
      return this.generateSimpleEmbed({
        description: 'There are no channels.',
        variant: 'error',
      });
    }

    return this.embedBuilderService.channelConfigList({
      description: 'Channel configs list.',
      channels: channelsValue,
    });
  }

  private generateSimpleEmbed({
    description,
    variant,
  }: {
    description: string;
    variant: EmbedVariant;
  }): EmbedBuilder {
    return this.embedBuilderService.simple({
      description,
      variant,
      title: CHANNEL_COMMANDS_CONFIG.embed.title,
      thumbnail: CHANNEL_COMMANDS_CONFIG.embed.thumbnail,
      logger: this.logger,
    });
  }
}
