import { DiscordChatgptTransaction } from '@Database/entities/discord-chatgpt-transaction.entity';
import { CronjobName } from '@Enums/cronjob-name.enum';
import { CurrencyCode } from '@Enums/currency-code.enum';
import { DateFormat } from '@Enums/date-format.enum';
import { DiscordSettingKey } from '@Enums/discord-setting-key.enum';
import { DiscordUserRole } from '@Enums/discord-user-role.enum';
import { EnvKey } from '@Enums/env-key.enum';
import { ErrorCode } from '@Enums/error-code.enum';
import { Injectable } from '@nestjs/common';
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
  Client,
  EmbedBuilder,
  GuildChannel,
  StringSelectMenuBuilder,
  TextChannel,
} from 'discord.js';
import { err, ok, Result } from 'neverthrow';
import { DiscordChatgptTransactionSummaryDto } from 'src/dtos/discord-chatgpt-transaction-summary.dto';
import { DiscordChatgptTransactionDto } from 'src/dtos/discord-chatgpt-transaction.dto';
import { DiscordUserDto } from 'src/dtos/discord-user.dto';
import { CHATGPT_COMMANDS_CONFIG } from '../configs/chatgpt-commands.config';
import { DiscordSelectId } from '../enums/discord-select-id.enum';
import { EmbedVariant } from '../types/embed-variant.type';
import { ChatgptEmbedBuilderService as EmbedBuilderService } from './chatgpt/chatgpt-embed.builder.service';

@Injectable()
export class ChatgptCommandsService {
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
    private readonly client: Client,
    private readonly discordUsersService: DiscordUsersService,
    private readonly discordSettingsService: DiscordSettingsService,
    private readonly discordChatgptTransactionsService: DiscordChatgptTransactionsService,
    private readonly discordChatgptTransactionSummariesService: DiscordChatgptTransactionSummariesService,
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  public async userAddHandler({
    userId,
    username,
  }: {
    userId: string;
    username: string;
  }): Promise<EmbedBuilder> {
    const existingUser = await this.discordUsersService.findByUserId(userId);

    if (existingUser.isOk()) {
      const hasExistingUserChatgptRole = existingUser.value.roles.includes(
        DiscordUserRole.CHATGPT,
      );

      if (hasExistingUserChatgptRole) {
        return this.generateSimpleEmbed({
          description: 'User is already in ChatGPT.',
          variant: 'error',
        });
      }

      await this.discordUsersService.update(
        new DiscordUserDto({
          id: existingUser.value.id,
          userId,
          username,
          roles: [...existingUser.value.roles, DiscordUserRole.CHATGPT],
        }),
      );

      return this.generateSimpleEmbed({
        description: 'User added to ChatGPT.',
        variant: 'success',
      });
    }

    const newUser = await this.discordUsersService.create(
      new DiscordUserDto({
        userId,
        username,
        roles: [DiscordUserRole.CHATGPT],
      }),
    );

    if (newUser.isErr()) {
      return this.generateSimpleEmbed({
        description: 'Error adding user to ChatGPT.',
        variant: 'error',
      });
    }

    return this.generateSimpleEmbed({
      description: 'User added to ChatGPT.',
      variant: 'success',
    });
  }

  public async userRemoveHandler({
    userId,
    username,
  }: {
    userId: string;
    username: string;
  }): Promise<EmbedBuilder> {
    const existingUser = await this.discordUsersService.findByUserId(userId);

    if (existingUser.isErr()) {
      return this.generateSimpleEmbed({
        description: 'User not found in ChatGPT.',
        variant: 'error',
      });
    }

    const hasExistingUserChatgptRole = existingUser.value.roles.includes(
      DiscordUserRole.CHATGPT,
    );

    if (!hasExistingUserChatgptRole) {
      return this.generateSimpleEmbed({
        description: 'User is not in ChatGPT.',
        variant: 'error',
      });
    }

    const hasExistingUserOtherRoles = existingUser.value.roles.length > 1;

    if (hasExistingUserOtherRoles) {
      await this.discordUsersService.update(
        new DiscordUserDto({
          id: existingUser.value.id,
          userId,
          username,
          roles: existingUser.value.roles.filter(
            (role) => role !== DiscordUserRole.CHATGPT,
          ),
        }),
      );

      return this.generateSimpleEmbed({
        description: 'User removed from ChatGPT.',
        variant: 'success',
      });
    }

    await this.discordUsersService.deleteByUserId(userId);

    return this.generateSimpleEmbed({
      description: 'User removed from ChatGPT.',
      variant: 'success',
    });
  }

  public async setPriceHandler({
    price,
  }: {
    price: number;
  }): Promise<EmbedBuilder> {
    const newPrice = await this.discordSettingsService.set(
      DiscordSettingKey.CHATGPT_PRICE,
      price,
    );

    if (newPrice.isErr()) {
      return this.generateSimpleEmbed({
        description: 'There was an error setting the price.',
        variant: 'error',
      });
    }

    return this.generateSimpleEmbed({
      description: 'Price set.',
      variant: 'success',
    });
  }

  public async setCurrencyHandler({
    currency,
  }: {
    currency: CurrencyCode;
  }): Promise<EmbedBuilder> {
    const newCurrency = await this.discordSettingsService.set(
      DiscordSettingKey.CHATGPT_CURRENCY,
      currency,
    );

    if (newCurrency.isErr()) {
      return this.generateSimpleEmbed({
        description: 'There was an error setting the currency.',
        variant: 'error',
      });
    }

    return this.generateSimpleEmbed({
      description: 'Currency set.',
      variant: 'success',
    });
  }

  public async setReminderHandler({
    day,
    time,
  }: {
    day: number;
    time: string;
  }): Promise<EmbedBuilder> {
    const newDate = await this.discordSettingsService.set(
      DiscordSettingKey.CHATGPT_REMINDER_DATE,
      `0 0 ${time} ${day} * *`,
    );

    if (newDate.isErr()) {
      return this.generateSimpleEmbed({
        description: 'There was an error setting the reminder date.',
        variant: 'error',
      });
    }

    await this.transactionRemindCronjobHandler();

    return this.generateSimpleEmbed({
      description: 'Reminder date set.',
      variant: 'success',
    });
  }

  public async setPaymentDateHandler({
    day,
  }: {
    day: number;
  }): Promise<EmbedBuilder> {
    const newDate = await this.discordSettingsService.set(
      DiscordSettingKey.CHATGPT_PAYMENT_DATE,
      day,
    );

    if (newDate.isErr()) {
      return this.generateSimpleEmbed({
        description: 'There was an error setting the payment date.',
        variant: 'error',
      });
    }

    return this.generateSimpleEmbed({
      description: 'Payment date set.',
      variant: 'success',
    });
  }

  public async setReminderChannelHandler({
    channel,
  }: {
    channel: GuildChannel;
  }): Promise<EmbedBuilder> {
    const newChannel = await this.discordSettingsService.set(
      DiscordSettingKey.CHATGPT_REMINDER_CHANNEL,
      {
        channelId: channel.id,
        guildId: channel.guild.id,
      },
    );

    if (newChannel.isErr()) {
      return this.generateSimpleEmbed({
        description: 'There was an error setting the reminder channel.',
        variant: 'error',
      });
    }

    return this.generateSimpleEmbed({
      description: 'Reminder channel set.',
      variant: 'success',
    });
  }

  public async transactionAddHandler({
    userId,
    price,
  }: {
    userId: string;
    price: number;
  }): Promise<EmbedBuilder> {
    const currency =
      await this.discordSettingsService.getValueByKey<CurrencyCode>(
        DiscordSettingKey.CHATGPT_CURRENCY,
      );

    if (currency.isErr()) {
      return this.generateSimpleEmbed({
        description: 'There was an error getting the currency.',
        variant: 'error',
      });
    }

    const newTransaction = await this.discordChatgptTransactionsService.create(
      new DiscordChatgptTransactionDto({
        discordUserId: userId,
        amount: price,
        currency: currency.value,
      }),
    );

    if (newTransaction.isErr()) {
      return this.generateSimpleEmbed({
        description: 'Error adding transaction to ChatGPT.',
        variant: 'error',
      });
    }

    return this.generateSimpleEmbed({
      description: 'Transaction added to ChatGPT.',
      variant: 'success',
    });
  }

  public async transactionRemoveHandler({
    userId,
  }: {
    userId: string;
  }): Promise<{
    embed: EmbedBuilder;
    component?: ActionRowBuilder<StringSelectMenuBuilder>;
  }> {
    const transactions =
      await this.discordChatgptTransactionsService.findAllByUserId(userId);

    if (transactions.length === 0) {
      return {
        embed: this.generateSimpleEmbed({
          description: 'You have no transactions in ChatGPT.',
          variant: 'error',
        }),
      };
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

    return {
      embed: this.generateSimpleEmbed({
        description: 'Select a transaction to remove from ChatGPT.',
        variant: 'info',
      }),
      component: row,
    };
  }

  public async transactionRemoveSelectHandler({
    userId,
    transactionId,
  }: {
    userId: string;
    transactionId: string;
  }): Promise<EmbedBuilder> {
    const transaction =
      await this.discordChatgptTransactionsService.findById(transactionId);

    if (transaction.isErr()) {
      return this.generateSimpleEmbed({
        description: 'Transaction not found in ChatGPT.',
        variant: 'error',
      });
    }

    const transactionToRemove = transaction.value;

    if (transactionToRemove.discordUserId !== userId) {
      return this.generateSimpleEmbed({
        description: 'You do not have permission to remove this transaction.',
        variant: 'error',
      });
    }

    const removedTransaction =
      await this.discordChatgptTransactionsService.deleteById(
        transactionToRemove.id,
      );

    if (removedTransaction.isErr()) {
      return this.generateSimpleEmbed({
        description: 'Error removing transaction from ChatGPT.',
        variant: 'error',
      });
    }

    return this.generateSimpleEmbed({
      description: 'Transaction removed from ChatGPT.',
      variant: 'success',
    });
  }

  public async transactionHistoryHandler({
    userId,
  }: {
    userId: string;
  }): Promise<EmbedBuilder> {
    const transactions =
      await this.discordChatgptTransactionsService.findAllByUserId(userId);

    if (transactions.length === 0) {
      return this.generateSimpleEmbed({
        description: 'You have no transactions in ChatGPT.',
        variant: 'error',
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

    return this.generateSimpleEmbed({
      description: 'Transactions history of your last 30 transactions.',
      variant: 'success',
    }).addFields(embedFields);
  }

  public async transactionSummaryHandler(): Promise<EmbedBuilder> {
    const transactionSummaryData = await this.generateTransactionSummaryData();

    if (transactionSummaryData.isErr()) {
      return this.generateSimpleEmbed({
        description: this.errorCodeMessageMap[transactionSummaryData.error]!,
        variant: 'error',
      });
    }

    const {
      transactionSummaries,
      nextPaymentDate,
      fromDate,
      toDate,
      pricePerUser,
      totalPrice,
      currency,
    } = transactionSummaryData.value;

    return this.generateChatgptSummaryEmbed({
      description: 'Transactions summary for the last payment period.',
      nextPaymentDate,
      fromDate,
      toDate,
      pricePerUser,
      totalPrice,
      currency,
      transactionSummaries,
    });
  }

  public async transactionGenerateSummaryHandler(): Promise<EmbedBuilder> {
    const transactionSummaryData = await this.generateTransactionSummaryData();

    if (transactionSummaryData.isErr()) {
      return this.generateSimpleEmbed({
        description: this.errorCodeMessageMap[transactionSummaryData.error]!,
        variant: 'error',
      });
    }

    const { transactionSummaries } = transactionSummaryData.value;

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
      return this.generateSimpleEmbed({
        description: 'Error creating transaction summaries.',
        variant: 'error',
      });
    }

    const newTransactionSummariesData =
      await this.generateTransactionSummaryData();

    if (newTransactionSummariesData.isErr()) {
      return this.generateSimpleEmbed({
        description:
          this.errorCodeMessageMap[newTransactionSummariesData.error]!,
        variant: 'error',
      });
    }

    const {
      transactionSummaries: newTransactionSummaries,
      nextPaymentDate: newNextPaymentDate,
      fromDate: newFromDate,
      toDate: newToDate,
      pricePerUser: newPricePerUser,
      totalPrice: newTotalPrice,
      currency: newCurrency,
    } = newTransactionSummariesData.value;

    return this.generateChatgptSummaryEmbed({
      description:
        'New transaction summaries were created for the last payment period.',
      nextPaymentDate: newNextPaymentDate,
      fromDate: newFromDate,
      toDate: newToDate,
      pricePerUser: newPricePerUser,
      totalPrice: newTotalPrice,
      currency: newCurrency,
      transactionSummaries: newTransactionSummaries,
    });
  }

  public async transactionRemindHandler(): Promise<EmbedBuilder> {
    const paymentDate = await this.discordSettingsService.getValueByKey<number>(
      DiscordSettingKey.CHATGPT_PAYMENT_DATE,
    );

    if (paymentDate.isErr()) {
      return this.generateSimpleEmbed({
        description: 'There was an error getting the payment date.',
        variant: 'error',
      });
    }

    const transactionSummaryData = await this.generateTransactionSummaryData();

    if (transactionSummaryData.isErr()) {
      return this.generateSimpleEmbed({
        description: this.errorCodeMessageMap[transactionSummaryData.error]!,
        variant: 'error',
      });
    }

    const {
      transactionSummaries,
      nextPaymentDate,
      fromDate,
      toDate,
      pricePerUser,
      totalPrice,
      currency,
    } = transactionSummaryData.value;

    return this.generateChatgptReminderEmbed({
      description:
        'The payment deadline for ChatGPT is approaching. Below is a list of people who are behind on their payments.',
      nextPaymentDate,
      fromDate,
      toDate,
      pricePerUser,
      totalPrice,
      currency,
      transactionSummaries,
    });
  }

  public async transactionRemindCronjobHandler(): Promise<void> {
    try {
      const existingCronJob = this.schedulerRegistry.getCronJob(
        CronjobName.DISCORD_CHATGPT_PAYMENT_REMINDER,
      );

      console.log(existingCronJob);

      if (existingCronJob) {
        await existingCronJob.stop();
        this.schedulerRegistry.deleteCronJob(
          CronjobName.DISCORD_CHATGPT_PAYMENT_REMINDER,
        );
      }
    } catch {
      // ignore
    }

    const reminderDate =
      await this.discordSettingsService.getValueByKey<string>(
        DiscordSettingKey.CHATGPT_REMINDER_DATE,
      );

    if (reminderDate.isErr()) return;

    const reminderChannel = await this.discordSettingsService.getValueByKey<{
      channelId: string;
      guildId: string;
    }>(DiscordSettingKey.CHATGPT_REMINDER_CHANNEL);

    if (reminderChannel.isErr()) return;

    const channel = await this.getChannel(reminderChannel.value.channelId);

    if (channel.isErr()) return;

    const channelValue = channel.value;

    if (!(channelValue instanceof TextChannel)) return;

    const newJob: CronJob = new CronJob(
      reminderDate.value,
      async () => {
        const embed = await this.transactionRemindHandler();
        await channelValue.sendTyping();
        await channelValue.send({ embeds: [embed] });
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

  private async generateTransactionSummaryData(): Promise<
    Result<
      {
        transactionSummaries: DiscordChatgptTransactionSummaryDto[];
        nextPaymentDate: Date;
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

    const newTransactionSummaries = await Promise.all(
      chatgptUsers.value.map(async (chatgptUser) => {
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
      }),
    );

    const nextPaymentDate = DateHelper.set(
      DateHelper.add(fromDate ?? today, {
        months: 1,
      }),
      {
        day: paymentDate.value,
      },
    );

    return ok({
      transactionSummaries: newTransactionSummaries,
      nextPaymentDate: nextPaymentDate ?? today,
      fromDate: fromDate ?? today,
      toDate: today,
      pricePerUser: pricePerUser,
      totalPrice: price.value,
      currency: currency.value,
    });
  }

  private generateSimpleEmbed({
    description,
    variant,
  }: {
    description: string;
    variant: EmbedVariant;
  }): EmbedBuilder {
    return EmbedBuilderService.simple({
      description,
      title: CHATGPT_COMMANDS_CONFIG.embed.title,
      thumbnail: CHATGPT_COMMANDS_CONFIG.embed.thumbnail,
      variant,
      client: this.client,
    });
  }

  private generateChatgptSummaryEmbed({
    description,
    nextPaymentDate,
    fromDate,
    toDate,
    pricePerUser,
    totalPrice,
    currency,
    transactionSummaries,
  }: {
    description: string;
    nextPaymentDate: Date;
    fromDate: Date;
    toDate: Date;
    pricePerUser: number;
    totalPrice: number;
    currency: CurrencyCode;
    transactionSummaries: DiscordChatgptTransactionSummaryDto[];
  }): EmbedBuilder {
    return EmbedBuilderService.chatgptSummary({
      description,
      title: CHATGPT_COMMANDS_CONFIG.embed.title,
      thumbnail: CHATGPT_COMMANDS_CONFIG.embed.thumbnail,
      nextPaymentDate,
      fromDate,
      toDate,
      pricePerUser,
      totalPrice,
      currency,
      transactionSummaries,
      client: this.client,
    });
  }

  private generateChatgptReminderEmbed({
    description,
    nextPaymentDate,
    fromDate,
    toDate,
    pricePerUser,
    totalPrice,
    currency,
    transactionSummaries,
  }: {
    description: string;
    nextPaymentDate: Date;
    fromDate: Date;
    toDate: Date;
    pricePerUser: number;
    totalPrice: number;
    currency: CurrencyCode;
    transactionSummaries: DiscordChatgptTransactionSummaryDto[];
  }): EmbedBuilder {
    return EmbedBuilderService.chatgptReminder({
      description,
      title: CHATGPT_COMMANDS_CONFIG.embed.title,
      thumbnail: CHATGPT_COMMANDS_CONFIG.embed.thumbnail,
      nextPaymentDate,
      fromDate,
      toDate,
      pricePerUser,
      totalPrice,
      currency,
      transactionSummaries,
      client: this.client,
    });
  }

  private async getChannel(
    channelId: string,
  ): Promise<Result<Channel, ErrorCode>> {
    try {
      const channel = await this.client.channels.fetch(channelId);
      return channel ? ok(channel) : err(ErrorCode.DISCORD_CHANNEL_NOT_FOUND);
    } catch {
      return err(ErrorCode.DISCORD_CHANNEL_NOT_FOUND);
    }
  }
}
