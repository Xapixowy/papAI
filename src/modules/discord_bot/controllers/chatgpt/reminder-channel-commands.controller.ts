import { CHATGPT_COMMANDS_CONFIG } from '@Modules/discord_bot/configs/chatgpt-commands.config';
import { RequiresDiscordUserRole } from '@Modules/discord_bot/decorators/requires-discord-user-role.decorator';
import { DiscordSelectId } from '@Modules/discord_bot/enums/discord-select-id.enum';
import { DiscordUserRoleGuard } from '@Modules/discord_bot/guards/discord-user-role.guard';
import { ChannelOption } from '@Modules/discord_bot/options/channel.option';
import { ReminderChannelCommandsService } from '@Modules/discord_bot/services/chatgpt/reminder-channel-commands.service';
import { Injectable, UseGuards } from '@nestjs/common';
import {
  GatewayIntentBits,
  InteractionResponse,
  MessageFlags,
} from 'discord.js';
import {
  Context,
  Options,
  SelectedStrings,
  type SlashCommandContext,
  StringSelect,
  type StringSelectContext,
  Subcommand,
} from 'necord';
import { BaseCommandsController } from '../base-commands.controller';
import { ChatgptCommandDecorator } from '../chatgpt-commands.controller';

const REMINDER_CHANNEL_COMMANDS_CONFIG =
  CHATGPT_COMMANDS_CONFIG.commands.reminderChannel;

@Injectable()
@UseGuards(DiscordUserRoleGuard)
@ChatgptCommandDecorator({
  name: REMINDER_CHANNEL_COMMANDS_CONFIG.name,
  description: REMINDER_CHANNEL_COMMANDS_CONFIG.description,
})
export class ReminderChannelCommandsController extends BaseCommandsController {
  constructor(
    private readonly reminderChannelCommandsService: ReminderChannelCommandsService,
  ) {
    super();
  }

  static get botIntents(): GatewayIntentBits[] {
    return [GatewayIntentBits.Guilds];
  }

  @Subcommand({
    name: REMINDER_CHANNEL_COMMANDS_CONFIG.commands.add.name,
    description: REMINDER_CHANNEL_COMMANDS_CONFIG.commands.add.description,
  })
  @RequiresDiscordUserRole(
    ...REMINDER_CHANNEL_COMMANDS_CONFIG.commands.add.userRoles,
  )
  public async onReminderChannelAddCommand(
    @Context() [interaction]: SlashCommandContext,
    @Options() { channel }: ChannelOption,
  ): Promise<InteractionResponse<boolean>> {
    const embed =
      await this.reminderChannelCommandsService.reminderChannelAddHandler({
        channel,
      });

    return interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [embed],
    });
  }

  @Subcommand({
    name: REMINDER_CHANNEL_COMMANDS_CONFIG.commands.remove.name,
    description: REMINDER_CHANNEL_COMMANDS_CONFIG.commands.remove.description,
  })
  @RequiresDiscordUserRole(
    ...REMINDER_CHANNEL_COMMANDS_CONFIG.commands.remove.userRoles,
  )
  public async onReminderChannelRemoveCommand(
    @Context() [interaction]: SlashCommandContext,
  ): Promise<InteractionResponse<boolean>> {
    const { embed, component } =
      await this.reminderChannelCommandsService.reminderChannelRemoveHandler();

    return interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [embed],
      components: component && [component],
    });
  }

  @StringSelect(DiscordSelectId.REMINDER_CHANNELS_TO_REMOVE)
  @RequiresDiscordUserRole(
    ...REMINDER_CHANNEL_COMMANDS_CONFIG.commands.remove.userRoles,
  )
  public async onReminderChannelRemoveSelect(
    @Context() [interaction]: StringSelectContext,
    @SelectedStrings() [channelId]: string[],
  ): Promise<InteractionResponse<boolean>> {
    const embed =
      await this.reminderChannelCommandsService.reminderChannelRemoveSelectHandler(
        {
          channelId,
        },
      );

    return interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [embed],
    });
  }

  @Subcommand({
    name: REMINDER_CHANNEL_COMMANDS_CONFIG.commands.list.name,
    description: REMINDER_CHANNEL_COMMANDS_CONFIG.commands.list.description,
  })
  @RequiresDiscordUserRole(
    ...REMINDER_CHANNEL_COMMANDS_CONFIG.commands.list.userRoles,
  )
  public async onReminderChannelListCommand(
    @Context() [interaction]: SlashCommandContext,
  ): Promise<InteractionResponse<boolean>> {
    const embed =
      await this.reminderChannelCommandsService.reminderChannelListHandler();

    return interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [embed],
    });
  }
}
