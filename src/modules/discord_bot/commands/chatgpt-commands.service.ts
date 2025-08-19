import { DiscordChatgptTransaction } from '@Database/entities/discord-chatgpt-transaction.entity';
import { CronjobName } from '@Enums/cronjob-name.enum';
import { CurrencyCode } from '@Enums/currency-code.enum';
import { DateFormat } from '@Enums/date-format.enum';
import { DiscordSettingKey } from '@Enums/discord-setting-key.enum';
import { DiscordUserRole } from '@Enums/discord-user-role.enum';
import { EnvKey } from '@Enums/env-key.enum';
import { ErrorCode } from '@Enums/error-code.enum';
import { Injectable, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { DiscordChatgptTransactionSummariesService } from '@Services/discord-chatgpt-transaction-summaries.service';
import { DiscordChatgptTransactionsService } from '@Services/discord-chatgpt-transactions.service';
import { DiscordSettingsService } from '@Services/discord-settings.service';
import { DiscordUsersService } from '@Services/discord-users.service';
import { DateHelper } from '@Utils/helpers/date.helper';
import { CronJob } from 'cron';
import {
  ActionRowBuilder,
  APIEmbedField,
  Channel,
  ChannelManager,
  Client,
  Events,
  GatewayIntentBits,
  InteractionResponse,
  MessageFlags,
  StringSelectMenuBuilder,
  TextChannel,
} from 'discord.js';
import {
  Context,
  createCommandGroupDecorator,
  Once,
  Options,
  SelectedStrings,
  type SlashCommandContext,
  StringSelect,
  type StringSelectContext,
  Subcommand,
} from 'necord';
import { err, ok, Result } from 'neverthrow';
import { DiscordChatgptTransactionSummaryDto } from 'src/dtos/discord-chatgpt-transaction-summary.dto';
import { DiscordChatgptTransactionDto } from 'src/dtos/discord-chatgpt-transaction.dto';
import { DiscordUserDto } from 'src/dtos/discord-user.dto';
import { RequiresDiscordUserRole } from '../decorators/requires-discord-user-role.decorator';
import { DiscordSelectId } from '../enums/discord-select-id.enum';
import { DiscordUserRoleGuard } from '../guards/discord-user-role.guard';
import { ChannelOption } from '../options/channel.option';
import { DayTimeOption } from '../options/chatgpt/day-time.option';
import { CurrencyOption } from '../options/currency.option';
import { DayOfMonthOption } from '../options/day-of-month.option';
import { PriceOption } from '../options/price.option';
import { UserOption } from '../options/user.option';
import { EmbedBuilderService } from '../services/embed-builder.service';
import { BaseCommandsService } from './base-commands-service';

const ChatgptCommandDecorator = createCommandGroupDecorator({
  name: 'chatgpt',
  description: 'ChatGPT commands',
});

@Injectable()
@UseGuards(DiscordUserRoleGuard)
@ChatgptCommandDecorator()
export class ChatgptCommandsService extends BaseCommandsService {
  private readonly errorCodeMessageMap: Partial<Record<ErrorCode, string>> = {
    [ErrorCode.DISCORD_SETTING_CHATGPT_PAYMENT_DATE_NOT_FOUND]:
      'There was an error getting the payment date.',
    [ErrorCode.DISCORD_SETTING_CHATGPT_PRICE_NOT_FOUND]:
      'There was an error getting the price.',
    [ErrorCode.DISCORD_SETTING_CHATGPT_CURRENCY_NOT_FOUND]:
      'There was an error getting the currency.',
    [ErrorCode.DISCORD_CHATGPT_USERS_NOT_FOUND]:
      'There was an error getting the ChatGPT users.',
  };

  constructor(
    private readonly discordUsersService: DiscordUsersService,
    private readonly discordSettingsService: DiscordSettingsService,
    private readonly discordChatgptTransactionsService: DiscordChatgptTransactionsService,
    private readonly discordChatgptTransactionSummariesService: DiscordChatgptTransactionSummariesService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly configService: ConfigService,
    private readonly channelManager: ChannelManager,
    private readonly client: Client,
  ) {
    super();
  }

  static get botIntents(): GatewayIntentBits[] {
    return [GatewayIntentBits.Guilds];
  }

  static get embedTitle(): string {
    return 'ChatGPT';
  }

  @Once(Events.ClientReady)
  async onClientReady(): Promise<void> {
    await this.setPaymentReminder();
  }

  @Subcommand({
    name: 'add',
    description: 'Adds a new user to the ChatGPT',
  })
  @RequiresDiscordUserRole(DiscordUserRole.SUPER_ADMIN)
  public async onAddCommand(
    @Context() [interaction]: StringSelectContext,
    @Options() { user }: UserOption,
  ): Promise<InteractionResponse<boolean>> {
    const { id, username } = user.user;

    const existingUser = await this.discordUsersService.findByUserId(id);

    if (existingUser.isOk()) {
      const hasExistingUserChatgptRole = existingUser.value.roles.includes(
        DiscordUserRole.CHATGPT,
      );

      if (hasExistingUserChatgptRole) {
        return interaction.reply({
          flags: [MessageFlags.Ephemeral],
          embeds: [
            EmbedBuilderService.simpleError({
              title: ChatgptCommandsService.embedTitle,
              message: 'User is already in ChatGPT.',
              client: this.client,
            }),
          ],
        });
      }

      await this.discordUsersService.update(
        new DiscordUserDto({
          id: existingUser.value.id,
          userId: id,
          username,
          roles: [...existingUser.value.roles, DiscordUserRole.CHATGPT],
        }),
      );

      return interaction.reply({
        flags: [MessageFlags.Ephemeral],
        embeds: [
          EmbedBuilderService.simpleSuccess({
            title: ChatgptCommandsService.embedTitle,
            description: 'User added to ChatGPT.',
            client: this.client,
          }),
        ],
      });
    }

    const newUser = await this.discordUsersService.create(
      new DiscordUserDto({
        userId: id,
        username,
        roles: [DiscordUserRole.CHATGPT],
      }),
    );

    if (newUser.isErr()) {
      return interaction.reply({
        flags: [MessageFlags.Ephemeral],
        embeds: [
          EmbedBuilderService.simpleError({
            message: 'Error adding user to ChatGPT.',
            title: ChatgptCommandsService.embedTitle,
            client: this.client,
          }),
        ],
      });
    }

    return interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [
        EmbedBuilderService.simpleSuccess({
          title: ChatgptCommandsService.embedTitle,
          description: 'User added to ChatGPT.',
          client: this.client,
        }),
      ],
    });
  }

  @Subcommand({
    name: 'remove',
    description: 'Removes a user from the ChatGPT',
  })
  @RequiresDiscordUserRole(DiscordUserRole.SUPER_ADMIN)
  public async onRemoveCommand(
    @Context() [interaction]: SlashCommandContext,
    @Options() { user }: UserOption,
  ): Promise<InteractionResponse<boolean>> {
    const { id, username } = user.user;

    const existingUser = await this.discordUsersService.findByUserId(id);

    if (existingUser.isErr()) {
      return interaction.reply({
        flags: [MessageFlags.Ephemeral],
        embeds: [
          EmbedBuilderService.simpleError({
            title: ChatgptCommandsService.embedTitle,
            message: 'User not found in ChatGPT.',
            client: this.client,
          }),
        ],
      });
    }

    const hasExistingUserChatgptRole = existingUser.value.roles.includes(
      DiscordUserRole.CHATGPT,
    );

    if (!hasExistingUserChatgptRole) {
      return interaction.reply({
        flags: [MessageFlags.Ephemeral],
        embeds: [
          EmbedBuilderService.simpleError({
            title: ChatgptCommandsService.embedTitle,
            message: 'User is not in ChatGPT.',
            client: this.client,
          }),
        ],
      });
    }

    const hasExistingUserOtherRoles = existingUser.value.roles.length > 1;

    if (hasExistingUserOtherRoles) {
      await this.discordUsersService.update(
        new DiscordUserDto({
          id: existingUser.value.id,
          userId: id,
          username,
          roles: existingUser.value.roles.filter(
            (role) => role !== DiscordUserRole.CHATGPT,
          ),
        }),
      );

      return interaction.reply({
        flags: [MessageFlags.Ephemeral],
        embeds: [
          EmbedBuilderService.simpleSuccess({
            title: ChatgptCommandsService.embedTitle,
            description: 'User removed from ChatGPT.',
            client: this.client,
          }),
        ],
      });
    }

    await this.discordUsersService.deleteByUserId(id);
    return interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [
        EmbedBuilderService.simpleSuccess({
          title: ChatgptCommandsService.embedTitle,
          description: 'User removed from ChatGPT.',
          client: this.client,
        }),
      ],
    });
  }

  @Subcommand({
    name: 'set-price',
    description: 'Sets the price of ChatGPT',
  })
  @RequiresDiscordUserRole(DiscordUserRole.SUPER_ADMIN)
  public async onSetPriceCommand(
    @Context() [interaction]: SlashCommandContext,
    @Options() { price }: PriceOption,
  ): Promise<InteractionResponse<boolean>> {
    const newPrice = await this.discordSettingsService.set(
      DiscordSettingKey.CHATGPT_PRICE,
      price,
    );

    if (newPrice.isErr()) {
      return interaction.reply({
        flags: [MessageFlags.Ephemeral],
        embeds: [
          EmbedBuilderService.simpleError({
            title: ChatgptCommandsService.embedTitle,
            message: 'There was an error setting the price.',
            client: this.client,
          }),
        ],
      });
    }

    return interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [
        EmbedBuilderService.simpleSuccess({
          title: ChatgptCommandsService.embedTitle,
          description: 'Price set.',
          client: this.client,
        }),
      ],
    });
  }

  @Subcommand({
    name: 'set-currency',
    description: 'Sets the currency of ChatGPT',
  })
  @RequiresDiscordUserRole(DiscordUserRole.SUPER_ADMIN)
  public async onSetCurrencyCommand(
    @Context() [interaction]: SlashCommandContext,
    @Options() { currency }: CurrencyOption,
  ): Promise<InteractionResponse<boolean>> {
    const newCurrency = await this.discordSettingsService.set(
      DiscordSettingKey.CHATGPT_CURRENCY,
      currency,
    );
    if (newCurrency.isErr()) {
      return interaction.reply({
        flags: [MessageFlags.Ephemeral],
        embeds: [
          EmbedBuilderService.simpleError({
            title: ChatgptCommandsService.embedTitle,
            message: 'There was an error setting the currency.',
            client: this.client,
          }),
        ],
      });
    }

    return interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [
        EmbedBuilderService.simpleSuccess({
          title: ChatgptCommandsService.embedTitle,
          description: 'Currency set.',
          client: this.client,
        }),
      ],
    });
  }

  @Subcommand({
    name: 'set-reminder-date',
    description: 'Sets the reminder date of ChatGPT',
  })
  @RequiresDiscordUserRole(DiscordUserRole.SUPER_ADMIN)
  public async onSetReminderDateCommand(
    @Context() [interaction]: SlashCommandContext,
    @Options() { day, time }: DayTimeOption,
  ): Promise<InteractionResponse<boolean>> {
    const newDate = await this.discordSettingsService.set(
      DiscordSettingKey.CHATGPT_REMINDER_DATE,
      `* * ${time} ${day} * *`,
    );

    if (newDate.isErr()) {
      return interaction.reply({
        flags: [MessageFlags.Ephemeral],
        embeds: [
          EmbedBuilderService.simpleError({
            title: ChatgptCommandsService.embedTitle,
            message: 'There was an error setting the reminder date.',
            client: this.client,
          }),
        ],
      });
    }

    await this.setPaymentReminder();

    return interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [
        EmbedBuilderService.simpleSuccess({
          title: ChatgptCommandsService.embedTitle,
          description: 'Reminder date set.',
          client: this.client,
        }),
      ],
    });
  }

  @Subcommand({
    name: 'set-payment-date',
    description: 'Sets the payment date of ChatGPT',
  })
  @RequiresDiscordUserRole(DiscordUserRole.SUPER_ADMIN)
  public async onSetPaymentDateCommand(
    @Context() [interaction]: SlashCommandContext,
    @Options() { day }: DayOfMonthOption,
  ): Promise<InteractionResponse<boolean>> {
    const newDate = await this.discordSettingsService.set(
      DiscordSettingKey.CHATGPT_PAYMENT_DATE,
      day,
    );

    if (newDate.isErr()) {
      return interaction.reply({
        flags: [MessageFlags.Ephemeral],
        embeds: [
          EmbedBuilderService.simpleError({
            title: ChatgptCommandsService.embedTitle,
            message: 'There was an error setting the payment date.',
            client: this.client,
          }),
        ],
      });
    }

    await this.setPaymentReminder();

    return interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [
        EmbedBuilderService.simpleSuccess({
          title: ChatgptCommandsService.embedTitle,
          description: 'Payment date set.',
          client: this.client,
        }),
      ],
    });
  }

  @Subcommand({
    name: 'set-reminder-channel',
    description: 'Sets the reminder channel of ChatGPT',
  })
  @RequiresDiscordUserRole(DiscordUserRole.SUPER_ADMIN)
  public async onSetReminderChannelCommand(
    @Context() [interaction]: SlashCommandContext,
    @Options() { channel }: ChannelOption,
  ): Promise<InteractionResponse<boolean>> {
    const newChannel = await this.discordSettingsService.set(
      DiscordSettingKey.CHATGPT_REMINDER_CHANNEL,
      {
        channelId: channel.id,
        guildId: channel.guild.id,
      },
    );

    if (newChannel.isErr()) {
      return interaction.reply({
        flags: [MessageFlags.Ephemeral],
        embeds: [
          EmbedBuilderService.simpleError({
            title: ChatgptCommandsService.embedTitle,
            message: 'There was an error setting the reminder channel.',
            client: this.client,
          }),
        ],
      });
    }

    await this.setPaymentReminder();

    return interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [
        EmbedBuilderService.simpleSuccess({
          title: ChatgptCommandsService.embedTitle,
          description: 'Reminder channel set.',
          client: this.client,
        }),
      ],
    });
  }

  @Subcommand({
    name: 'pay',
    description: 'Adds a transaction to the ChatGPT',
  })
  @RequiresDiscordUserRole(DiscordUserRole.CHATGPT)
  public async onAddTransactionCommand(
    @Context() [interaction]: SlashCommandContext,
    @Options() { price }: PriceOption,
  ): Promise<InteractionResponse<boolean>> {
    await this.discordChatgptTransactionsService.create(
      new DiscordChatgptTransactionDto({
        discordUserId: interaction.user.id,
        amount: price,
        currency: CurrencyCode.USD,
      }),
    );

    return interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [
        EmbedBuilderService.simpleSuccess({
          title: ChatgptCommandsService.embedTitle,
          description: 'Transaction added to ChatGPT.',
          client: this.client,
        }),
      ],
    });
  }

  @Subcommand({
    name: 'refund',
    description: 'Removes a transaction from the ChatGPT',
  })
  @RequiresDiscordUserRole(DiscordUserRole.CHATGPT)
  public async onRemoveTransactionCommand(
    @Context() [interaction]: SlashCommandContext,
  ) {
    const transactions =
      await this.discordChatgptTransactionsService.findAllByUserId(
        interaction.user.id,
      );

    if (transactions.length === 0) {
      return interaction.reply({
        flags: [MessageFlags.Ephemeral],
        embeds: [
          EmbedBuilderService.simpleError({
            title: ChatgptCommandsService.embedTitle,
            message: 'You have no transactions in ChatGPT.',
            client: this.client,
          }),
        ],
      });
    }

    const transactionOptions = transactions
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((t, i) => ({
        label: `Transaction #${transactions.length - i}`,
        value: t.id,
        description: `🕤 ${DateHelper.formatDate(t.createdAt, DateFormat.DATE_TIME_SECONDS)} | 💰 ${t.amount} ${t.currency}`,
      }));

    const transactionsSelectMenu = new StringSelectMenuBuilder()
      .setCustomId(DiscordSelectId.TRANSACTIONS_TO_REMOVE)
      .setPlaceholder('Select a transaction to remove')
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(transactionOptions);

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      transactionsSelectMenu,
    );

    return interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [
        EmbedBuilderService.simpleInfo({
          title: ChatgptCommandsService.embedTitle,
          description: 'Select a transaction to remove from ChatGPT.',
          client: this.client,
        }),
      ],
      components: [row],
    });
  }

  @StringSelect(DiscordSelectId.TRANSACTIONS_TO_REMOVE)
  @RequiresDiscordUserRole(DiscordUserRole.CHATGPT)
  public async onTransactionsToRemoveSelect(
    @Context() [interaction]: StringSelectContext,
    @SelectedStrings() [transactionId]: string[],
  ): Promise<InteractionResponse<boolean>> {
    const transaction =
      await this.discordChatgptTransactionsService.findById(transactionId);

    if (transaction.isErr()) {
      return interaction.reply({
        flags: [MessageFlags.Ephemeral],
        embeds: [
          EmbedBuilderService.simpleError({
            title: ChatgptCommandsService.embedTitle,
            message: 'Transaction not found in ChatGPT.',
            client: this.client,
          }),
        ],
      });
    }

    const transactionToRemove = transaction.value;

    if (transactionToRemove.discordUserId !== interaction.user.id) {
      return interaction.reply({
        flags: [MessageFlags.Ephemeral],
        embeds: [
          EmbedBuilderService.simpleError({
            title: ChatgptCommandsService.embedTitle,
            message: 'You do not have permission to remove this transaction.',
            client: this.client,
          }),
        ],
      });
    }

    const removedTransaction =
      await this.discordChatgptTransactionsService.deleteById(
        transactionToRemove.id,
      );

    if (removedTransaction.isErr()) {
      return interaction.reply({
        flags: [MessageFlags.Ephemeral],
        embeds: [
          EmbedBuilderService.simpleError({
            title: ChatgptCommandsService.embedTitle,
            message: 'Error removing transaction from ChatGPT.',
            client: this.client,
          }),
        ],
      });
    }

    return interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [
        EmbedBuilderService.simpleSuccess({
          title: ChatgptCommandsService.embedTitle,
          description: 'Transaction removed from ChatGPT.',
          client: this.client,
        }),
      ],
    });
  }

  @Subcommand({
    name: 'history',
    description: 'Sets the reminder date of ChatGPT',
  })
  @RequiresDiscordUserRole(DiscordUserRole.SUPER_ADMIN)
  public async onHistoryCommand(
    @Context() [interaction]: SlashCommandContext,
  ): Promise<InteractionResponse<boolean>> {
    const transactions =
      await this.discordChatgptTransactionsService.findAllByUserId(
        interaction.user.id,
      );

    if (transactions.length === 0) {
      return interaction.reply({
        flags: [MessageFlags.Ephemeral],
        embeds: [
          EmbedBuilderService.simpleError({
            title: ChatgptCommandsService.embedTitle,
            message: 'You have no transactions in ChatGPT.',
            client: this.client,
          }),
        ],
      });
    }

    const last30Transactions = transactions
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 30);

    const transactionsGroupedByMonth = last30Transactions.reduce(
      (acc, transaction) => {
        const month = DateHelper.formatDate(
          transaction.createdAt,
          DateFormat.MONTH_STANDALONE,
        );
        const monthTransactions = acc[month] ?? [];
        monthTransactions.push(transaction);
        acc[month] = monthTransactions;
        return acc;
      },
      {} as Record<string, DiscordChatgptTransaction[]>,
    );

    const embedFields: APIEmbedField[] = Object.entries(
      transactionsGroupedByMonth,
    ).map(([month, transactions]) => {
      const monthlyTransactions = transactions
        .map(
          (t) =>
            '- `' +
            `Transaction #${transactions.length - transactions.indexOf(t)} (🕤 ${DateHelper.formatDate(t.createdAt, DateFormat.DATE_TIME_SECONDS)} | 💰 ${t.amount} ${t.currency})` +
            '`',
        )
        .join('\n');

      return {
        name: `${month} (${transactions.length})`,
        value: monthlyTransactions,
      };
    });

    return interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [
        EmbedBuilderService.simpleSuccess({
          title: ChatgptCommandsService.embedTitle,
          description: 'Transactions history of your last 30 transactions.',
          client: this.client,
        }).addFields(embedFields),
      ],
    });
  }

  @Subcommand({
    name: 'summary',
    description: 'Shows the transaction summary for the last payment period',
  })
  @RequiresDiscordUserRole(DiscordUserRole.CHATGPT)
  public async onTransactionSummaryCommand(
    @Context() [interaction]: SlashCommandContext,
  ): Promise<InteractionResponse<boolean>> {
    const transactionSummaryData = await this.generateTransactionSummaryData();

    if (transactionSummaryData.isErr()) {
      return interaction.reply({
        flags: [MessageFlags.Ephemeral],
        embeds: [
          EmbedBuilderService.simpleError({
            title: ChatgptCommandsService.embedTitle,
            message: this.errorCodeMessageMap[transactionSummaryData.error],
            client: this.client,
          }),
        ],
      });
    }

    const {
      transactionSummaries,
      fromDate,
      toDate,
      pricePerUser,
      totalPrice,
      currency,
    } = transactionSummaryData.value;

    return interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [
        EmbedBuilderService.chatgptSummary({
          title: ChatgptCommandsService.embedTitle,
          description: 'Transactions summary for the last payment period.',
          fromDate,
          toDate,
          pricePerUser,
          totalPrice,
          currency,
          transactionSummaries,
          client: this.client,
        }),
      ],
    });
  }

  @Subcommand({
    name: 'generate-summary',
    description: 'Generates a transaction summary for the last payment period',
  })
  @RequiresDiscordUserRole(DiscordUserRole.SUPER_ADMIN)
  public async onGenerateSummaryCommand(
    @Context() [interaction]: SlashCommandContext,
  ): Promise<InteractionResponse<boolean>> {
    const transactionSummaryData = await this.generateTransactionSummaryData();

    if (transactionSummaryData.isErr()) {
      return interaction.reply({
        flags: [MessageFlags.Ephemeral],
        embeds: [
          EmbedBuilderService.simpleError({
            title: ChatgptCommandsService.embedTitle,
            message: this.errorCodeMessageMap[transactionSummaryData.error],
            client: this.client,
          }),
        ],
      });
    }

    const {
      transactionSummaries,
      fromDate,
      toDate,
      pricePerUser,
      totalPrice,
      currency,
    } = transactionSummaryData.value;

    let creatingTransactionSummaryError: boolean = false;

    for (const transactionSummary of transactionSummaries) {
      const newTransactionSummary =
        await this.discordChatgptTransactionSummariesService.create(
          new DiscordChatgptTransactionSummaryDto({
            discordUserId: transactionSummary.discordUserId,
            amount: transactionSummary.amount,
            currency: transactionSummary.currency,
          }),
        );

      if (newTransactionSummary.isErr()) {
        creatingTransactionSummaryError = true;
        continue;
      }
    }

    if (creatingTransactionSummaryError) {
      return interaction.reply({
        flags: [MessageFlags.Ephemeral],
        embeds: [
          EmbedBuilderService.simpleError({
            title: ChatgptCommandsService.embedTitle,
            message: 'Error creating transaction summaries.',
            client: this.client,
          }),
        ],
      });
    }

    return interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [
        EmbedBuilderService.chatgptSummary({
          title: ChatgptCommandsService.embedTitle,
          description:
            'New transaction summaries were created for the last payment period.',
          fromDate,
          toDate,
          pricePerUser,
          totalPrice,
          currency,
          transactionSummaries,
          client: this.client,
        }),
      ],
    });
  }

  private async generateTransactionSummaryData(): Promise<
    Result<
      {
        transactionSummaries: DiscordChatgptTransactionSummaryDto[];
        fromDate: Date;
        toDate: Date;
        pricePerUser: number;
        totalPrice: number;
        currency: CurrencyCode;
      },
      ErrorCode
    >
  > {
    const today = new Date();

    const paymentDate = await this.discordSettingsService.getValueByKey<number>(
      DiscordSettingKey.CHATGPT_PAYMENT_DATE,
    );

    if (paymentDate.isErr()) {
      return err(ErrorCode.DISCORD_SETTING_CHATGPT_PAYMENT_DATE_NOT_FOUND);
    }

    const price = await this.discordSettingsService.getValueByKey<number>(
      DiscordSettingKey.CHATGPT_PRICE,
    );

    if (price.isErr()) {
      return err(ErrorCode.DISCORD_SETTING_CHATGPT_PRICE_NOT_FOUND);
    }

    const currency =
      await this.discordSettingsService.getValueByKey<CurrencyCode>(
        DiscordSettingKey.CHATGPT_CURRENCY,
      );

    if (currency.isErr()) {
      return err(ErrorCode.DISCORD_SETTING_CHATGPT_CURRENCY_NOT_FOUND);
    }

    const chatgptUsers = await this.discordUsersService.findAllByRoles([
      DiscordUserRole.CHATGPT,
    ]);

    if (chatgptUsers.isErr()) {
      return err(ErrorCode.DISCORD_CHATGPT_USERS_NOT_FOUND);
    }

    const pricePerUser =
      Math.ceil((price.value * 100) / chatgptUsers.value.length) / 100;

    let fromDate: Date | null = null;

    const newTransactionSummaries = chatgptUsers.value.map(
      async (chatgptUser) => {
        const userTransactionSummaries =
          await this.discordChatgptTransactionSummariesService.findAllByUserId(
            chatgptUser.userId,
          );

        const userTransactions =
          await this.discordChatgptTransactionsService.findAllByUserId(
            chatgptUser.userId,
          );

        const lastTransactionSummaryDate =
          userTransactionSummaries.length > 0
            ? userTransactionSummaries[0].createdAt
            : DateHelper.subtract(today, { months: 1 });

        fromDate = fromDate
          ? lastTransactionSummaryDate > fromDate
            ? lastTransactionSummaryDate
            : fromDate
          : lastTransactionSummaryDate;

        const lastTransactionSummaryAmount =
          userTransactionSummaries.length > 0
            ? userTransactionSummaries[0].amount
            : 0;

        const userTransactionsLastPaymentPeriod = userTransactions.filter(
          (t) => t.createdAt > lastTransactionSummaryDate,
        );

        const transactionsSum = userTransactionsLastPaymentPeriod.reduce(
          (acc, t) => acc + t.amount,
          0,
        );

        const sumOverall =
          Math.round(
            (transactionsSum + lastTransactionSummaryAmount - pricePerUser) *
              100,
          ) / 100;

        return new DiscordChatgptTransactionSummaryDto({
          discordUserId: chatgptUser.userId,
          discordUser: DiscordUserDto.fromEntity(chatgptUser),
          amount: sumOverall,
          currency: currency.value,
          createdAt: today,
          updatedAt: today,
        });
      },
    );

    return ok({
      transactionSummaries: await Promise.all(newTransactionSummaries),
      fromDate: fromDate ?? today,
      toDate: today,
      pricePerUser: pricePerUser,
      totalPrice: price.value,
      currency: currency.value,
    });
  }

  private async getChannel(
    channelId: string,
  ): Promise<Result<Channel, ErrorCode>> {
    try {
      const channel = await this.channelManager.fetch(channelId);
      return channel ? ok(channel) : err(ErrorCode.DISCORD_CHANNEL_NOT_FOUND);
    } catch {
      return err(ErrorCode.DISCORD_CHANNEL_NOT_FOUND);
    }
  }

  private async sendPaymentReminderMessage(): Promise<Result<void, ErrorCode>> {
    const paymentDate = await this.discordSettingsService.getValueByKey<number>(
      DiscordSettingKey.CHATGPT_PAYMENT_DATE,
    );

    if (paymentDate.isErr()) return err(paymentDate.error);

    const reminderChannel = await this.discordSettingsService.getValueByKey<{
      channelId: string;
      guildId: string;
    }>(DiscordSettingKey.CHATGPT_REMINDER_CHANNEL);

    if (reminderChannel.isErr()) return err(reminderChannel.error);

    const channel = await this.getChannel(reminderChannel.value.channelId);

    if (channel.isErr()) return err(channel.error);

    const channelValue = channel.value;

    if (!(channelValue instanceof TextChannel))
      return err(ErrorCode.DISCORD_CHANNEL_WRONG_TYPE);

    const transactionSummaryData = await this.generateTransactionSummaryData();

    if (transactionSummaryData.isErr())
      return err(transactionSummaryData.error);

    const {
      transactionSummaries,
      fromDate,
      toDate,
      pricePerUser,
      totalPrice,
      currency,
    } = transactionSummaryData.value;

    await channelValue.sendTyping();
    await channelValue.send({
      embeds: [
        EmbedBuilderService.chatgptReminder({
          title: ChatgptCommandsService.embedTitle,
          description:
            'The payment deadline for ChatGPT is approaching. Below is a list of people who are behind on their payments.',
          fromDate,
          toDate,
          pricePerUser,
          totalPrice,
          currency,
          transactionSummaries,
          client: this.client,
        }),
      ],
    });

    return ok(undefined);
  }

  private async setPaymentReminder(): Promise<void> {
    try {
      const existingCronJob = this.schedulerRegistry.getCronJob(
        CronjobName.DISCORD_CHATGPT_PAYMENT_REMINDER,
      );

      if (existingCronJob) {
        await existingCronJob.stop();
        this.schedulerRegistry.deleteCronJob(
          CronjobName.DISCORD_CHATGPT_PAYMENT_REMINDER,
        );
      }
    } catch {}

    const reminderDate =
      await this.discordSettingsService.getValueByKey<string>(
        DiscordSettingKey.CHATGPT_REMINDER_DATE,
      );

    if (reminderDate.isErr()) return;

    const newJob = new CronJob(
      reminderDate.value,
      async () => {
        const result = await this.sendPaymentReminderMessage();
        if (result.isErr()) console.error(result.error);
      },
      null,
      true,
      this.configService.get<string>(EnvKey.APP_TIMEZONE),
    );

    this.schedulerRegistry.addCronJob(
      CronjobName.DISCORD_CHATGPT_PAYMENT_REMINDER,
      newJob,
    );
  }
}
