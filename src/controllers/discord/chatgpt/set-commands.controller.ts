import { CHATGPT_COMMANDS_CONFIG } from '@Constants/discord/chatgpt-commands.constant';
import { RequiresDiscordUserRole } from '@Decorators/requires-discord-user-role.decorator';
import { DiscordUserRoleGuard } from '@Guards/discord/discord-user-role.guard';
import { Injectable, UseGuards } from '@nestjs/common';
import { DayTimeOption } from '@Options/chatgpt/day-time.option';
import { CurrencyOption } from '@Options/currency.option';
import { DayOfMonthOption } from '@Options/day-of-month.option';
import { PriceOption } from '@Options/price.option';
import { SetCommandsService } from '@Services/discord/chatgpt/set-commands.service';
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
})
export class SetCommandsController extends BaseCommandsController {
  constructor(private readonly setCommandsService: SetCommandsService) {
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
    const embed = await this.setCommandsService.setPriceHandler({
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
    const embed = await this.setCommandsService.setCurrencyHandler({
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
    const embed = await this.setCommandsService.setReminderHandler({
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
    const embed = await this.setCommandsService.setPaymentDateHandler({
      day,
    });

    return interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [embed],
    });
  }
}
