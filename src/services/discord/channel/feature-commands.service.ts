import { CHANNEL_COMMANDS_CONFIG } from '@Constants/discord/channel-commands.constant';
import { ERROR_CODE_MESSAGE_MAP } from '@Constants/error-messages.constant';
import { DiscordChannelDto } from '@DTOs/discord-channel.dto';
import { DiscordChannelFeature } from '@Enums/discord/discord-channel-feature.enum';
import { DiscordSelectId } from '@Enums/discord/discord-select-id.enum';
import { Injectable, Logger } from '@nestjs/common';
import { DiscordChannelService } from '@Services/discord-channel.service';
import { EmbedVariant } from '@Types/discord/embed-variant.type';
import {
  ActionRowBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
} from 'discord.js';
import { ChannelEmbedBuilderService } from './channel-embed-builder.service';

@Injectable()
export class FeatureCommandsService {
  private readonly logger = new Logger(this.constructor.name);

  constructor(
    private readonly embedBuilderService: ChannelEmbedBuilderService,
    private readonly discordChannelService: DiscordChannelService,
  ) {}

  async setHandler({
    guildId,
    feature,
    value,
  }: {
    guildId: string;
    feature: DiscordChannelFeature;
    value: boolean;
  }): Promise<{
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

    const channelsOptions = channelsValue.map((c, i) => ({
      label: `Channel #${channelsValue.length - i}`,
      value: c.id,
      description: `💬 ${c.name} | ${c.id}`,
    }));

    const channelsSelectMenu = new StringSelectMenuBuilder()
      .setCustomId(
        `${DiscordSelectId.CHANNELS_TO_SET_FEATURE}/${feature}/${value ? 'true' : 'false'}`,
      )
      .setPlaceholder('Select a channel to set the feature')
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(channelsOptions);

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      channelsSelectMenu,
    );

    return {
      embed: this.generateSimpleEmbed({
        description: 'Select a channel to set the feature.',
        variant: 'info',
      }),
      component: row,
    };
  }

  async setSelectHandler({
    feature,
    value,
    channelId,
  }: {
    feature: DiscordChannelFeature;
    value: boolean;
    channelId: string;
  }): Promise<EmbedBuilder> {
    const channel = await this.discordChannelService.findById(channelId);

    if (channel.isErr()) {
      return this.generateSimpleEmbed({
        description: ERROR_CODE_MESSAGE_MAP[channel.error],
        variant: 'error',
      });
    }

    const channelValue = channel.value;

    const newChannel = DiscordChannelDto.fromEntity(channelValue);
    newChannel.features[feature] = value;

    const updatedChannel = await this.discordChannelService.update(newChannel);

    if (updatedChannel.isErr()) {
      return this.generateSimpleEmbed({
        description: ERROR_CODE_MESSAGE_MAP[updatedChannel.error],
        variant: 'error',
      });
    }

    return this.generateSimpleEmbed({
      description: 'Feature set.',
      variant: 'success',
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
