import { CHATGPT_COMMANDS_CONFIG } from '@Modules/discord_bot/configs/chatgpt-commands.config';
import { RequiresDiscordUserRole } from '@Modules/discord_bot/decorators/requires-discord-user-role.decorator';
import { DiscordUserRoleGuard } from '@Modules/discord_bot/guards/discord-user-role.guard';
import { ChannelOption } from '@Modules/discord_bot/options/channel.option';
import { DayTimeOption } from '@Modules/discord_bot/options/chatgpt/day-time.option';
import { CurrencyOption } from '@Modules/discord_bot/options/currency.option';
import { DayOfMonthOption } from '@Modules/discord_bot/options/day-of-month.option';
import { PriceOption } from '@Modules/discord_bot/options/price.option';
import { ChatgptCommandsService } from '@Modules/discord_bot/services/chatgpt-commands.service';
import { Injectable, UseGuards } from '@nestjs/common';
import {
  GatewayIntentBits,
  InteractionResponse,
  MessageFlags,
} from 'discord.js';
import { Context, Options, type SlashCommandContext, Subcommand } from 'necord';
import { BaseCommandsController } from '../base-commands.controller';
import { ChatgptCommandDecorator } from '../chatgpt-commands.controller';

const SET_COMMANDS_CONFIG = CHATGPT_COMMANDS_CONFIG.commands.set;

@Injectable()
@UseGuards(DiscordUserRoleGuard)
@ChatgptCommandDecorator({
  name: SET_COMMANDS_CONFIG.name,
  description: SET_COMMANDS_CONFIG.description,
  options: [],
})
export class SetCommandsController extends BaseCommandsController {
  constructor(private readonly chatgptCommandsService: ChatgptCommandsService) {
    super();
  }

  static get botIntents(): GatewayIntentBits[] {
    return [GatewayIntentBits.Guilds];
  }

  @Subcommand({
    name: SET_COMMANDS_CONFIG.commands.price.name,
    description: SET_COMMANDS_CONFIG.commands.price.description,
  })
  @RequiresDiscordUserRole(...SET_COMMANDS_CONFIG.commands.price.userRoles)
  public async onSetPriceCommand(
    @Context() [interaction]: SlashCommandContext,
    @Options() { price }: PriceOption,
  ): Promise<InteractionResponse<boolean>> {
    const embed = await this.chatgptCommandsService.setPriceHandler({
      price,
    });

    return interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [embed],
    });
  }

  @Subcommand({
    name: SET_COMMANDS_CONFIG.commands.currency.name,
    description: SET_COMMANDS_CONFIG.commands.currency.description,
  })
  @RequiresDiscordUserRole(...SET_COMMANDS_CONFIG.commands.currency.userRoles)
  public async onSetCurrencyCommand(
    @Context() [interaction]: SlashCommandContext,
    @Options() { currency }: CurrencyOption,
  ): Promise<InteractionResponse<boolean>> {
    const embed = await this.chatgptCommandsService.setCurrencyHandler({
      currency,
    });

    return interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [embed],
    });
  }

  @Subcommand({
    name: SET_COMMANDS_CONFIG.commands.reminder.name,
    description: SET_COMMANDS_CONFIG.commands.reminder.description,
  })
  @RequiresDiscordUserRole(...SET_COMMANDS_CONFIG.commands.reminder.userRoles)
  public async onSetReminderCommand(
    @Context() [interaction]: SlashCommandContext,
    @Options() { day, time }: DayTimeOption,
  ): Promise<InteractionResponse<boolean>> {
    const embed = await this.chatgptCommandsService.setReminderHandler({
      day,
      time,
    });

    return interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [embed],
    });
  }

  @Subcommand({
    name: SET_COMMANDS_CONFIG.commands.payment.name,
    description: SET_COMMANDS_CONFIG.commands.payment.description,
  })
  @RequiresDiscordUserRole(...SET_COMMANDS_CONFIG.commands.payment.userRoles)
  public async onSetPaymentCommand(
    @Context() [interaction]: SlashCommandContext,
    @Options() { day }: DayOfMonthOption,
  ): Promise<InteractionResponse<boolean>> {
    const embed = await this.chatgptCommandsService.setPaymentDateHandler({
      day,
    });

    return interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [embed],
    });
  }

  @Subcommand({
    name: SET_COMMANDS_CONFIG.commands.reminderChannel.name,
    description: SET_COMMANDS_CONFIG.commands.reminderChannel.description,
  })
  @RequiresDiscordUserRole(
    ...SET_COMMANDS_CONFIG.commands.reminderChannel.userRoles,
  )
  public async onSetReminderChannelCommand(
    @Context() [interaction]: SlashCommandContext,
    @Options() { channel }: ChannelOption,
  ): Promise<InteractionResponse<boolean>> {
    const embed = await this.chatgptCommandsService.setReminderChannelHandler({
      channel,
    });

    return interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [embed],
    });
  }
}
