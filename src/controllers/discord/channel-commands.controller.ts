import { CHANNEL_COMMANDS_CONFIG } from '@Constants/discord/channel-commands.constant';
import { RequiresDiscordUserRole } from '@Decorators/requires-discord-user-role.decorator';
import { DiscordSelectId } from '@Enums/discord/discord-select-id.enum';
import { DiscordUserRoleGuard } from '@Guards/discord/discord-user-role.guard';
import { Injectable, UseGuards } from '@nestjs/common';
import { ChannelOption } from '@Options/channel.option';
import { ChannelCommandsService } from '@Services/discord/channel-commands.service';
import { CommandConfigCommand } from '@Types/discord/command-config.type';
import { GatewayIntentBits, MessageFlags } from 'discord.js';
import {
  Context,
  createCommandGroupDecorator,
  Options,
  SelectedStrings,
  type SlashCommandContext,
  StringSelect,
  type StringSelectContext,
  Subcommand,
} from 'necord';
import { BaseCommandsController } from './base-commands.controller';

export const ChannelCommandDecorator = createCommandGroupDecorator({
  name: CHANNEL_COMMANDS_CONFIG.name,
  description: CHANNEL_COMMANDS_CONFIG.description,
});

const ADD_COMMAND_CONFIG = CHANNEL_COMMANDS_CONFIG.commands
  .add as CommandConfigCommand;

const REMOVE_COMMAND_CONFIG = CHANNEL_COMMANDS_CONFIG.commands
  .remove as CommandConfigCommand;

const LIST_COMMAND_CONFIG = CHANNEL_COMMANDS_CONFIG.commands
  .list as CommandConfigCommand;

@Injectable()
@UseGuards(DiscordUserRoleGuard)
@ChannelCommandDecorator()
export class ChannelCommandsController extends BaseCommandsController {
  static get botIntents(): GatewayIntentBits[] {
    return [];
  }

  constructor(private readonly channelCommandsService: ChannelCommandsService) {
    super();
  }

  @Subcommand(ADD_COMMAND_CONFIG)
  @RequiresDiscordUserRole(...ADD_COMMAND_CONFIG.userRoles)
  public async onInitializeCommand(
    @Context() [interaction]: SlashCommandContext,
    @Options() { channel }: ChannelOption,
  ): Promise<void> {
    const guildId = interaction.guildId;

    if (!guildId) {
      return;
    }

    const { id: channelId, name: channelName } = channel;

    const embed = await this.channelCommandsService.addHandler({
      guildId,
      channelId,
      channelName,
    });

    await interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [embed],
    });
  }

  @Subcommand(REMOVE_COMMAND_CONFIG)
  @RequiresDiscordUserRole(...REMOVE_COMMAND_CONFIG.userRoles)
  public async onRemoveCommand(
    @Context() [interaction]: SlashCommandContext,
  ): Promise<void> {
    const guildId = interaction.guildId;

    if (!guildId) {
      return;
    }

    const { embed, component } =
      await this.channelCommandsService.removeHandler(guildId);

    await interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [embed],
      components: component && [component],
    });
  }

  @StringSelect(DiscordSelectId.CHANNELS_TO_REMOVE)
  @RequiresDiscordUserRole(...REMOVE_COMMAND_CONFIG.userRoles)
  public async onRemoveSelect(
    @Context() [interaction]: StringSelectContext,
    @SelectedStrings() [channelId]: string[],
  ): Promise<void> {
    if (!channelId) {
      return;
    }

    const embed =
      await this.channelCommandsService.removeSelectHandler(channelId);

    await interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [embed],
    });
  }

  @Subcommand(LIST_COMMAND_CONFIG)
  @RequiresDiscordUserRole(...LIST_COMMAND_CONFIG.userRoles)
  public async onListCommand(
    @Context() [interaction]: SlashCommandContext,
  ): Promise<void> {
    const guildId = interaction.guildId;

    if (!guildId) {
      return;
    }

    const embed = await this.channelCommandsService.listHandler(guildId);

    await interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [embed],
    });
  }
}
