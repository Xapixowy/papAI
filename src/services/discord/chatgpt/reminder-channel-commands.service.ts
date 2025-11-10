import { CHATGPT_COMMANDS_CONFIG } from '@Constants/discord/chatgpt-commands.constant';
import { ERROR_CODE_MESSAGE_MAP } from '@Constants/error-messages.constant';
import { DiscordSelectId } from '@Enums/discord/discord-select-id.enum';
import { DiscordSettingKey } from '@Enums/discord/discord-setting-key.enum';
import { ErrorCode } from '@Enums/error-code.enum';
import { Injectable, Logger } from '@nestjs/common';
import { DiscordSettingsService } from '@Services/discord-settings.service';
import { DiscordChatgptReminderChannel } from '@Types/discord/chatgpt';
import { EmbedVariant } from '@Types/discord/embed-variant.type';
import {
  ActionRowBuilder,
  EmbedBuilder,
  GuildChannel,
  StringSelectMenuBuilder,
} from 'discord.js';
import { ok } from 'neverthrow';
import { ChatgptEmbedBuilderService } from './chatgpt-embed-builder.service';

@Injectable()
export class ReminderChannelCommandsService {
  private readonly logger = new Logger(this.constructor.name);

  constructor(
    private readonly discordSettingsService: DiscordSettingsService,
    private readonly embedBuilderService: ChatgptEmbedBuilderService,
  ) {}

  public async reminderChannelAddHandler({
    channel,
  }: {
    channel: GuildChannel;
  }): Promise<EmbedBuilder> {
    let existingReminderChannels =
      await this.discordSettingsService.getValueByKey<
        DiscordChatgptReminderChannel[]
      >({
        key: DiscordSettingKey.CHATGPT_REMINDER_CHANNELS,
      });

    if (
      existingReminderChannels.isErr() &&
      existingReminderChannels.error === ErrorCode.DISCORD_SETTING_NOT_FOUND
    ) {
      const newReminderChannelsSetting = await this.discordSettingsService.set({
        key: DiscordSettingKey.CHATGPT_REMINDER_CHANNELS,
        value: [],
      });

      if (newReminderChannelsSetting.isErr()) {
        return this.generateSimpleEmbed({
          description: ERROR_CODE_MESSAGE_MAP[newReminderChannelsSetting.error],
          variant: 'error',
        });
      }

      const newReminderChannelsSettingValue = newReminderChannelsSetting.value;

      existingReminderChannels = ok<DiscordChatgptReminderChannel[]>(
        newReminderChannelsSettingValue.value as DiscordChatgptReminderChannel[],
      );
    }

    if (existingReminderChannels.isErr()) {
      return this.generateSimpleEmbed({
        description: ERROR_CODE_MESSAGE_MAP[existingReminderChannels.error],
        variant: 'error',
      });
    }

    const existingReminderChannelsValue = existingReminderChannels.value;
    const newReminderChannels = [
      ...existingReminderChannelsValue.filter(
        (reminderChannel) => reminderChannel.channelId !== channel.id,
      ),
      {
        channelId: channel.id,
        channelName: channel.name,
        guildId: channel.guild.id,
        guildName: channel.guild.name,
      },
    ];

    const newChannel = await this.discordSettingsService.set({
      key: DiscordSettingKey.CHATGPT_REMINDER_CHANNELS,
      value: newReminderChannels,
    });

    if (newChannel.isErr()) {
      return this.generateSimpleEmbed({
        description: ERROR_CODE_MESSAGE_MAP[newChannel.error],
        variant: 'error',
      });
    }

    return this.generateSimpleEmbed({
      description: 'Reminder channels set.',
      variant: 'success',
    });
  }

  public async reminderChannelRemoveHandler(): Promise<{
    embed: EmbedBuilder;
    component?: ActionRowBuilder<StringSelectMenuBuilder>;
  }> {
    const reminderChannels = await this.discordSettingsService.getValueByKey<
      DiscordChatgptReminderChannel[]
    >({
      key: DiscordSettingKey.CHATGPT_REMINDER_CHANNELS,
    });

    if (reminderChannels.isErr()) {
      return {
        embed: this.generateSimpleEmbed({
          description: ERROR_CODE_MESSAGE_MAP[reminderChannels.error],
          variant: 'error',
        }),
      };
    }

    const reminderChannelsValue = reminderChannels.value;

    if (reminderChannelsValue.length === 0) {
      return {
        embed: this.generateSimpleEmbed({
          description: 'There are no reminder channels.',
          variant: 'error',
        }),
      };
    }

    const reminderChannelsOptions = reminderChannelsValue.map((c, i) => ({
      label: `Reminder Channel #${reminderChannelsValue.length - i}`,
      value: c.channelId,
      description: `🌐 ${c.guildName} | 🐀 ${c.channelName}`,
    }));

    const reminderChannelsSelectMenu = new StringSelectMenuBuilder()
      .setCustomId(DiscordSelectId.REMINDER_CHANNELS_TO_REMOVE)
      .setPlaceholder('Select a reminder channel to remove')
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(reminderChannelsOptions);

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      reminderChannelsSelectMenu,
    );

    return {
      embed: this.generateSimpleEmbed({
        description: 'Select a reminder channel to remove.',
        variant: 'info',
      }),
      component: row,
    };
  }

  public async reminderChannelRemoveSelectHandler({
    channelId,
  }: {
    channelId: string;
  }): Promise<EmbedBuilder> {
    const reminderChannels = await this.discordSettingsService.getValueByKey<
      DiscordChatgptReminderChannel[]
    >({
      key: DiscordSettingKey.CHATGPT_REMINDER_CHANNELS,
    });

    if (reminderChannels.isErr()) {
      return this.generateSimpleEmbed({
        description: ERROR_CODE_MESSAGE_MAP[reminderChannels.error],
        variant: 'error',
      });
    }

    const reminderChannelsValue = reminderChannels.value;

    const newReminderChannels = reminderChannelsValue.filter(
      (reminderChannel) => reminderChannel.channelId !== channelId,
    );

    const newReminderChannelsSetting = await this.discordSettingsService.set({
      key: DiscordSettingKey.CHATGPT_REMINDER_CHANNELS,
      value: newReminderChannels,
    });

    if (newReminderChannelsSetting.isErr()) {
      return this.generateSimpleEmbed({
        description: ERROR_CODE_MESSAGE_MAP[newReminderChannelsSetting.error],
        variant: 'error',
      });
    }

    return this.generateSimpleEmbed({
      description: 'Reminder channels removed.',
      variant: 'success',
    });
  }

  public async reminderChannelListHandler(): Promise<EmbedBuilder> {
    const reminderChannels = await this.discordSettingsService.getValueByKey<
      DiscordChatgptReminderChannel[]
    >({
      key: DiscordSettingKey.CHATGPT_REMINDER_CHANNELS,
    });

    if (reminderChannels.isErr()) {
      return this.generateSimpleEmbed({
        description: ERROR_CODE_MESSAGE_MAP[reminderChannels.error],
        variant: 'error',
      });
    }

    const reminderChannelsValue = reminderChannels.value;

    return this.embedBuilderService.chatgptReminderChannels({
      description: 'Reminder channels list.',
      chatgptReminderChannels: reminderChannelsValue,
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
      title: CHATGPT_COMMANDS_CONFIG.embed.title,
      thumbnail: CHATGPT_COMMANDS_CONFIG.embed.thumbnail,
      variant,
      logger: this.logger,
    });
  }
}
