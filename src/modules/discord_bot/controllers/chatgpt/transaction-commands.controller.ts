import { CHATGPT_COMMANDS_CONFIG } from '@Modules/discord_bot/configs/chatgpt-commands.config';
import { RequiresDiscordUserRole } from '@Modules/discord_bot/decorators/requires-discord-user-role.decorator';
import { DiscordSelectId } from '@Modules/discord_bot/enums/discord-select-id.enum';
import { DiscordUserRoleGuard } from '@Modules/discord_bot/guards/discord-user-role.guard';
import { SendToAllReminderChannelsOption } from '@Modules/discord_bot/options/chatgpt/send-to-all-reminder-channels.option';
import { EphemeralOption } from '@Modules/discord_bot/options/ephemeral.option';
import { PriceOption } from '@Modules/discord_bot/options/price.option';
import { ChatgptCommandsService } from '@Modules/discord_bot/services/chatgpt-commands.service';
import { Injectable, UseGuards } from '@nestjs/common';
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
  constructor(private readonly chatgptCommandsService: ChatgptCommandsService) {
    super();
  }

  static get botIntents(): GatewayIntentBits[] {
    return [GatewayIntentBits.Guilds];
  }

  @Once(Events.ClientReady)
  async onClientReady(): Promise<void> {
    await this.chatgptCommandsService.transactionRemindCronjobHandler();
  }

  @Subcommand({
    name: TRANSACTION_COMMANDS_CONFIG.commands.add.name,
    description: TRANSACTION_COMMANDS_CONFIG.commands.add.description,
  })
  @RequiresDiscordUserRole(
    ...TRANSACTION_COMMANDS_CONFIG.commands.add.userRoles,
  )
  public async onAddCommand(
    @Context() [interaction]: SlashCommandContext,
    @Options() { price }: PriceOption,
  ): Promise<InteractionResponse<boolean>> {
    const { id } = interaction.user;

    const embed = await this.chatgptCommandsService.transactionAddHandler({
      userId: id,
      price,
    });

    return interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [embed],
    });
  }

  @Subcommand({
    name: TRANSACTION_COMMANDS_CONFIG.commands.remove.name,
    description: TRANSACTION_COMMANDS_CONFIG.commands.remove.description,
  })
  @RequiresDiscordUserRole(
    ...TRANSACTION_COMMANDS_CONFIG.commands.remove.userRoles,
  )
  public async onRemoveCommand(
    @Context() [interaction]: SlashCommandContext,
  ): Promise<InteractionResponse<boolean>> {
    const { id } = interaction.user;

    const { embed, component } =
      await this.chatgptCommandsService.transactionRemoveHandler({
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
      await this.chatgptCommandsService.transactionRemoveSelectHandler({
        userId: id,
        transactionId,
      });

    return interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [embed],
    });
  }

  @Subcommand({
    name: TRANSACTION_COMMANDS_CONFIG.commands.history.name,
    description: TRANSACTION_COMMANDS_CONFIG.commands.history.description,
  })
  @RequiresDiscordUserRole(
    ...TRANSACTION_COMMANDS_CONFIG.commands.history.userRoles,
  )
  public async onHistoryCommand(
    @Context() [interaction]: SlashCommandContext,
  ): Promise<InteractionResponse<boolean>> {
    const { id } = interaction.user;

    const embed = await this.chatgptCommandsService.transactionHistoryHandler({
      userId: id,
    });

    return interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [embed],
    });
  }

  @Subcommand({
    name: TRANSACTION_COMMANDS_CONFIG.commands.summary.name,
    description: TRANSACTION_COMMANDS_CONFIG.commands.summary.description,
  })
  @RequiresDiscordUserRole(
    ...TRANSACTION_COMMANDS_CONFIG.commands.summary.userRoles,
  )
  public async onTransactionSummaryCommand(
    @Context() [interaction]: SlashCommandContext,
    @Options() { ephemeral }: EphemeralOption,
  ): Promise<InteractionResponse<boolean>> {
    const embed = await this.chatgptCommandsService.transactionSummaryHandler();

    const isEphemeral = ephemeral === null ? true : ephemeral;

    return interaction.reply({
      flags: isEphemeral ? [MessageFlags.Ephemeral] : [],
      embeds: [embed],
    });
  }

  @Subcommand({
    name: TRANSACTION_COMMANDS_CONFIG.commands.generateSummary.name,
    description:
      TRANSACTION_COMMANDS_CONFIG.commands.generateSummary.description,
  })
  @RequiresDiscordUserRole(
    ...TRANSACTION_COMMANDS_CONFIG.commands.generateSummary.userRoles,
  )
  public async onGenerateTransactionSummaryCommand(
    @Context() [interaction]: SlashCommandContext,
    @Options() { ephemeral }: EphemeralOption,
  ): Promise<InteractionResponse<boolean>> {
    const embed =
      await this.chatgptCommandsService.transactionGenerateSummaryHandler();

    const isEphemeral = ephemeral === null ? true : ephemeral;

    return interaction.reply({
      flags: isEphemeral ? [MessageFlags.Ephemeral] : [],
      embeds: [embed],
    });
  }

  @Subcommand({
    name: TRANSACTION_COMMANDS_CONFIG.commands.remind.name,
    description: TRANSACTION_COMMANDS_CONFIG.commands.remind.description,
  })
  @RequiresDiscordUserRole(
    ...TRANSACTION_COMMANDS_CONFIG.commands.remind.userRoles,
  )
  public async onRemindTransactionSummaryCommand(
    @Context() [interaction]: SlashCommandContext,
    @Options() { sendToAllReminderChannels }: SendToAllReminderChannelsOption,
  ): Promise<InteractionResponse<boolean>> {
    const { embed, remindEmbed, channels } =
      await this.chatgptCommandsService.transactionRemindHandler({
        sendToAllReminderChannels: sendToAllReminderChannels ?? false,
      });

    if (remindEmbed && channels) {
      for (const channel of channels) {
        await channel.sendTyping();
        await channel.send({ embeds: [remindEmbed] });
      }

      return interaction.reply({
        embeds: [embed],
      });
    }

    return interaction.reply({
      embeds: [embed],
    });
  }
}
