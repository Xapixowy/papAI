import { CHATGPT_COMMANDS_CONFIG } from '@Constants/discord/chatgpt-commands.constant';
import { RequiresDiscordUserRole } from '@Decorators/requires-discord-user-role.decorator';
import { DiscordSelectId } from '@Enums/discord/discord-select-id.enum';
import { DiscordUserRoleGuard } from '@Guards/discord/discord-user-role.guard';
import { Injectable, UseGuards } from '@nestjs/common';
import { SendToAllReminderChannelsOption } from '@Options/chatgpt/send-to-all-reminder-channels.option';
import { EphemeralOption } from '@Options/ephemeral.option';
import { PriceOption } from '@Options/price.option';
import { TransactionCommandsService } from '@Services/discord/chatgpt/transaction-commands.service';
import {
  Events,
  GatewayIntentBits,
  InteractionResponse,
  MessageFlags,
} from 'discord.js';
import {
  Context,
  Once,
  Options,
  SelectedStrings,
  type SlashCommandContext,
  StringSelect,
  type StringSelectContext,
  Subcommand,
} from 'necord';
import { BaseCommandsController } from '../base-commands.controller';
import { ChatgptCommandDecorator } from '../chatgpt-commands.controller';

const TRANSACTION_COMMANDS_CONFIG =
  CHATGPT_COMMANDS_CONFIG.commands.transaction;

@Injectable()
@UseGuards(DiscordUserRoleGuard)
@ChatgptCommandDecorator({
  name: TRANSACTION_COMMANDS_CONFIG.name,
  description: TRANSACTION_COMMANDS_CONFIG.description,
})
export class TransactionCommandsController extends BaseCommandsController {
  constructor(
    private readonly transactionCommandsService: TransactionCommandsService,
  ) {
    super();
  }

  static get botIntents(): GatewayIntentBits[] {
    return [GatewayIntentBits.Guilds];
  }

  @Once(Events.ClientReady)
  async onClientReady(): Promise<void> {
    await this.transactionCommandsService.transactionRemindCronjobHandler();
  }

  @Subcommand(TRANSACTION_COMMANDS_CONFIG.commands.add)
  @RequiresDiscordUserRole(
    ...TRANSACTION_COMMANDS_CONFIG.commands.add.userRoles,
  )
  public async onAddCommand(
    @Context() [interaction]: SlashCommandContext,
    @Options() { price }: PriceOption,
  ): Promise<InteractionResponse<boolean>> {
    const { id } = interaction.user;

    const embed = await this.transactionCommandsService.transactionAddHandler({
      userId: id,
      price,
    });

    return interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [embed],
    });
  }

  @Subcommand(TRANSACTION_COMMANDS_CONFIG.commands.remove)
  @RequiresDiscordUserRole(
    ...TRANSACTION_COMMANDS_CONFIG.commands.remove.userRoles,
  )
  public async onRemoveCommand(
    @Context() [interaction]: SlashCommandContext,
  ): Promise<InteractionResponse<boolean>> {
    const { id } = interaction.user;

    const { embed, component } =
      await this.transactionCommandsService.transactionRemoveHandler({
        userId: id,
      });

    return interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [embed],
      components: component && [component],
    });
  }

  @StringSelect(DiscordSelectId.TRANSACTIONS_TO_REMOVE)
  @RequiresDiscordUserRole(
    ...TRANSACTION_COMMANDS_CONFIG.commands.remove.userRoles,
  )
  public async onRemoveSelect(
    @Context() [interaction]: StringSelectContext,
    @SelectedStrings() [transactionId]: string[],
  ): Promise<InteractionResponse<boolean>> {
    const { id } = interaction.user;

    const embed =
      await this.transactionCommandsService.transactionRemoveSelectHandler({
        userId: id,
        transactionId,
      });

    return interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [embed],
    });
  }

  @Subcommand(TRANSACTION_COMMANDS_CONFIG.commands.history)
  @RequiresDiscordUserRole(
    ...TRANSACTION_COMMANDS_CONFIG.commands.history.userRoles,
  )
  public async onHistoryCommand(
    @Context() [interaction]: SlashCommandContext,
  ): Promise<InteractionResponse<boolean>> {
    const { id } = interaction.user;

    const embed =
      await this.transactionCommandsService.transactionHistoryHandler({
        userId: id,
      });

    return interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [embed],
    });
  }

  @Subcommand(TRANSACTION_COMMANDS_CONFIG.commands.summary)
  @RequiresDiscordUserRole(
    ...TRANSACTION_COMMANDS_CONFIG.commands.summary.userRoles,
  )
  public async onTransactionSummaryCommand(
    @Context() [interaction]: SlashCommandContext,
    @Options() { ephemeral }: EphemeralOption,
  ): Promise<InteractionResponse<boolean>> {
    const embed =
      await this.transactionCommandsService.transactionSummaryHandler();

    const isEphemeral = ephemeral === null ? true : ephemeral;

    return interaction.reply({
      flags: isEphemeral ? [MessageFlags.Ephemeral] : [],
      embeds: [embed],
    });
  }

  @Subcommand(TRANSACTION_COMMANDS_CONFIG.commands.generateSummary)
  @RequiresDiscordUserRole(
    ...TRANSACTION_COMMANDS_CONFIG.commands.generateSummary.userRoles,
  )
  public async onGenerateTransactionSummaryCommand(
    @Context() [interaction]: SlashCommandContext,
    @Options() { ephemeral }: EphemeralOption,
  ): Promise<InteractionResponse<boolean>> {
    const embed =
      await this.transactionCommandsService.transactionGenerateSummaryHandler();

    const isEphemeral = ephemeral === null ? true : ephemeral;

    return interaction.reply({
      flags: isEphemeral ? [MessageFlags.Ephemeral] : [],
      embeds: [embed],
    });
  }

  @Subcommand(TRANSACTION_COMMANDS_CONFIG.commands.remind)
  @RequiresDiscordUserRole(
    ...TRANSACTION_COMMANDS_CONFIG.commands.remind.userRoles,
  )
  public async onRemindTransactionSummaryCommand(
    @Context() [interaction]: SlashCommandContext,
    @Options() { sendToAllReminderChannels }: SendToAllReminderChannelsOption,
  ): Promise<InteractionResponse<boolean>> {
    const { embed, remindEmbed, channels } =
      await this.transactionCommandsService.transactionRemindHandler({
        sendToAllReminderChannels: sendToAllReminderChannels ?? false,
      });

    if (remindEmbed && channels) {
      for (const channel of channels) {
        await channel.sendTyping();
        await channel.send({ embeds: [remindEmbed] });
      }

      return interaction.reply({
        flags: [MessageFlags.Ephemeral],
        embeds: [embed],
      });
    }

    return interaction.reply({
      embeds: [embed],
    });
  }
}
