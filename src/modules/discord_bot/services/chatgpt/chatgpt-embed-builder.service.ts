import { DiscordUserDto } from '@DTOs/discord-user.dto';
import { CurrencyCode } from '@Enums/currency-code.enum';
import { DateFormat } from '@Enums/date-format.enum';
import { CHATGPT_COMMANDS_CONFIG } from '@Modules/discord_bot/configs/chatgpt-commands.config';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DiscordChatgptReminderChannel } from '@Types/discord/chatgpt';
import { DateHelper } from '@Utils/helpers/date.helper';
import { Client, EmbedBuilder } from 'discord.js';
import { DiscordChatgptTransactionSummaryDto } from 'src/dtos/discord-chatgpt-transaction-summary.dto';
import { EmbedBuilderService } from '../embed-builder.service';

@Injectable()
export class ChatgptEmbedBuilderService extends EmbedBuilderService {
  constructor(
    protected readonly client: Client,
    protected readonly configService: ConfigService,
  ) {
    super(client, configService);
  }

  chatgptSummary({
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
    const { information, summary } = this.generateChatgptSummarySections({
      nextPaymentDate,
      fromDate,
      toDate,
      pricePerUser,
      totalPrice,
      currency,
      transactionSummaries,
    });

    return this.simple({
      description: `${description}\n${information}\n${summary}`,
      thumbnail: CHATGPT_COMMANDS_CONFIG.embed.thumbnail,
      title: CHATGPT_COMMANDS_CONFIG.embed.title,
      variant: 'success',
    });
  }

  chatgptReminder({
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
    const { information, debtors } = this.generateChatgptSummarySections({
      nextPaymentDate,
      fromDate,
      toDate,
      pricePerUser,
      totalPrice,
      currency,
      transactionSummaries,
    });

    return this.simple({
      description: `${description}\n${information}\n${debtors}`,
      thumbnail: CHATGPT_COMMANDS_CONFIG.embed.thumbnail,
      title: CHATGPT_COMMANDS_CONFIG.embed.title,
      variant: 'warning',
    });
  }

  chatgptReminderChannels({
    description,
    chatgptReminderChannels,
  }: {
    description: string;
    chatgptReminderChannels: DiscordChatgptReminderChannel[];
  }): EmbedBuilder {
    const reminderChannelsSection = this.generateReminderChannelSection({
      chatgptReminderChannels,
    });

    return this.simple({
      description: `${description}\n${reminderChannelsSection}`,
      thumbnail: CHATGPT_COMMANDS_CONFIG.embed.thumbnail,
      title: CHATGPT_COMMANDS_CONFIG.embed.title,
      variant: 'info',
    });
  }

  chatgptConfigList({
    description,
    chatgptCurrency,
    chatgptPrice,
    chatgptPaymentDate,
    chatgptReminderDate,
    chatgptReminderChannels,
    chatgptUsers,
  }: {
    description: string;
    chatgptCurrency: CurrencyCode;
    chatgptPrice: number;
    chatgptPaymentDate: number;
    chatgptReminderDate: string;
    chatgptReminderChannels: DiscordChatgptReminderChannel[];
    chatgptUsers: DiscordUserDto[];
  }): EmbedBuilder {
    const settingsSection = this.generateSettingsSection({
      chatgptCurrency,
      chatgptPrice,
      chatgptPaymentDate,
      chatgptReminderDate,
    });

    const usersSection = this.generateUsersSection({
      chatgptUsers,
    });

    const reminderChannelsSection = this.generateReminderChannelSection({
      chatgptReminderChannels,
    });

    return this.simple({
      description: `${description}\n${settingsSection}\n${reminderChannelsSection}\n${usersSection}`,
      thumbnail: CHATGPT_COMMANDS_CONFIG.embed.thumbnail,
      title: CHATGPT_COMMANDS_CONFIG.embed.title,
      variant: 'info',
    });
  }

  private generateSettingsSection({
    chatgptCurrency,
    chatgptPrice,
    chatgptPaymentDate,
    chatgptReminderDate,
  }: {
    chatgptCurrency: CurrencyCode;
    chatgptPrice: number;
    chatgptPaymentDate: number;
    chatgptReminderDate: string;
  }): string {
    const [, , reminderHour, reminderDay] = chatgptReminderDate.split(' ');

    return this.generateSection({
      title: '`🔧` Settings',
      description: [
        `- Currency: ` + '`' + chatgptCurrency + '`',
        `- Price: ` + '`' + chatgptPrice.toFixed(2) + '`',
        `- Payment date: ` +
          '`' +
          `Every ${chatgptPaymentDate} day of month` +
          '`',
        `- Reminder date: ` +
          '`' +
          `Every ${reminderDay} day of month at ${reminderHour}:00` +
          '`',
      ],
    });
  }

  private generateReminderChannelSection({
    chatgptReminderChannels,
  }: {
    chatgptReminderChannels: DiscordChatgptReminderChannel[];
  }): string {
    return this.generateSection({
      title: '`🔔` Reminder Channels',
      description: chatgptReminderChannels.length
        ? chatgptReminderChannels.map(
            (c) => '- `' + `🌐 ${c.guildName} | 🐀 ${c.channelName}` + '`',
          )
        : ['There are no reminder channels.'],
    });
  }

  private generateUsersSection({
    chatgptUsers,
  }: {
    chatgptUsers: DiscordUserDto[];
  }): string {
    const longestUsernameLength = this.getLongestUsernameLength({
      users: chatgptUsers,
    });

    const userListItems = chatgptUsers.map((u) => {
      const usernameSpaces: string = ' '.repeat(
        longestUsernameLength - u.username.length,
      );
      return `- \`${u.username} ${usernameSpaces}| \`<@!${u.id}>`;
    });

    return this.generateSection({
      title: '`👤` Users',
      description: userListItems.length
        ? userListItems
        : ['There are no users.'],
    });
  }

  private generateChatgptSummarySections({
    nextPaymentDate,
    fromDate,
    toDate,
    pricePerUser,
    totalPrice,
    currency,
    transactionSummaries,
  }: {
    nextPaymentDate: Date;
    fromDate: Date;
    toDate: Date;
    pricePerUser: number;
    totalPrice: number;
    currency: CurrencyCode;
    transactionSummaries: DiscordChatgptTransactionSummaryDto[];
  }): {
    information: string;
    summary: string;
    debtors: string;
  } {
    const nextPaymentDateString: string = DateHelper.formatDate(
      nextPaymentDate,
      DateFormat.DATE,
    );
    const nextPaymentDistanceString: string =
      DateHelper.formatDistance(nextPaymentDate);
    const fromDateString: string = DateHelper.formatDate(
      fromDate,
      DateFormat.DATE_TIME,
    );
    const toDateString: string = DateHelper.formatDate(
      toDate,
      DateFormat.DATE_TIME,
    );
    const debtorsTransactionSummaries = transactionSummaries.filter(
      (t) => t.amount < 0,
    );
    const numberOfDebtors: number = debtorsTransactionSummaries.length;
    const debtorsTotalAmount: number = Math.abs(
      debtorsTransactionSummaries.reduce((acc, t) => acc + t.amount, 0),
    );

    let summaryDescription: string = '';
    if (numberOfDebtors === 0) {
      summaryDescription = `All **${transactionSummaries.length} people** have made their payments.`;
    } else if (numberOfDebtors === 1) {
      summaryDescription = `At the moment, **${numberOfDebtors} person** has not yet made a payment for a total amount of **${debtorsTotalAmount.toFixed(2)} ${currency}**.`;
    } else {
      summaryDescription = `At the moment, **${numberOfDebtors} people** have not yet made their payments, totaling **${debtorsTotalAmount.toFixed(2)} ${currency}**.`;
    }

    const transactionSummariesUsers = transactionSummaries
      .map((t) => t.discordUser)
      .filter((u) => u !== undefined);

    const longestUsernameLength = this.getLongestUsernameLength({
      users: transactionSummariesUsers,
    });

    const informationSection = this.generateSection({
      title: '`ℹ️` Information',
      description: [
        `Next ChatGPT payment will be **${nextPaymentDistanceString}**.`,
        '',
        `- next payment: ` + '`' + nextPaymentDateString + '`',
        `- from: ` + '`' + fromDateString + '`',
        `- to: ` + '`' + toDateString + '`',
        `- users: ` + '`' + `${transactionSummaries.length}` + '`',
        `- price per user: ` +
          '`' +
          `${pricePerUser.toFixed(2)} ${currency}` +
          '`',
        `- total price: ` + '`' + `${totalPrice.toFixed(2)} ${currency}` + '`',
      ],
    });

    const summarySection = this.generateSection({
      title: '`📈` Summary',
      description: [
        `${summaryDescription}`,
        '',
        ...transactionSummaries.map((transactionSummary) =>
          this.generateChatgptUserSummary({
            transactionSummary,
            longestUsernameLength,
          }),
        ),
      ],
    });

    const debtorsSection = this.generateSection({
      title: '`🙇` Debtors',
      description: [
        `${summaryDescription}`,
        '',
        ...debtorsTransactionSummaries.map((transactionSummary) =>
          this.generateChatgptUserSummary({
            transactionSummary,
            longestUsernameLength,
          }),
        ),
      ],
    });

    return {
      information: informationSection,
      summary: summarySection,
      debtors: debtorsSection,
    };
  }

  private generateChatgptUserSummary({
    transactionSummary,
    longestUsernameLength,
  }: {
    transactionSummary: DiscordChatgptTransactionSummaryDto;
    longestUsernameLength: number;
  }): string {
    const icon: string = transactionSummary.amount >= 0 ? '✅' : '❌';
    const username: string = transactionSummary.discordUser?.username ?? '';
    const userMention: string = `<@!${transactionSummary.discordUser?.id ?? ''}>`;
    const usernameSpaces: string = ' '.repeat(
      longestUsernameLength - username.length,
    );
    const amount: string = transactionSummary.amount.toFixed(2);
    const amountSpace: string = transactionSummary.amount >= 0 ? ' ' : '';
    const currency: string = transactionSummary.currency;

    return (
      '- `' +
      `${icon} ${username}${usernameSpaces ?? ''} | ${amountSpace}${amount} ${currency}` +
      ' | `' +
      userMention
    );
  }

  private getLongestUsernameLength({
    users,
  }: {
    users: DiscordUserDto[];
  }): number {
    let longestUsernameLength: number = 0;
    users.forEach((u) => {
      if (u.username?.length ?? 0 > longestUsernameLength) {
        longestUsernameLength = u.username?.length ?? 0;
      }
    });
    return longestUsernameLength;
  }
}
