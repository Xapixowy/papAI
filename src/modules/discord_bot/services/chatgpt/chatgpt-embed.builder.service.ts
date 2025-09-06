import { CurrencyCode } from '@Enums/currency-code.enum';
import { DateFormat } from '@Enums/date-format.enum';
import { DateHelper } from '@Utils/helpers/date.helper';
import { Client, EmbedBuilder } from 'discord.js';
import { DiscordChatgptTransactionSummaryDto } from 'src/dtos/discord-chatgpt-transaction-summary.dto';
import { EmbedBuilderService } from '../embed-builder.service';

export class ChatgptEmbedBuilderService extends EmbedBuilderService {
  static chatgptSummary({
    title,
    description,
    nextPaymentDate,
    fromDate,
    toDate,
    pricePerUser,
    totalPrice,
    currency,
    transactionSummaries,
    thumbnail,
    client,
  }: {
    title: string;
    description: string;
    nextPaymentDate: Date;
    fromDate: Date;
    toDate: Date;
    pricePerUser: number;
    totalPrice: number;
    currency: CurrencyCode;
    transactionSummaries: DiscordChatgptTransactionSummaryDto[];
    thumbnail?: string;
    client: Client;
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

    return EmbedBuilderService.simple({
      description: `${description}\n${information}\n${summary}`,
      title,
      thumbnail,
      variant: 'success',
      client,
    });
  }

  static chatgptReminder({
    title,
    description,
    nextPaymentDate,
    fromDate,
    toDate,
    pricePerUser,
    totalPrice,
    currency,
    transactionSummaries,
    thumbnail,
    client,
  }: {
    title: string;
    description: string;
    nextPaymentDate: Date;
    fromDate: Date;
    toDate: Date;
    pricePerUser: number;
    totalPrice: number;
    currency: CurrencyCode;
    transactionSummaries: DiscordChatgptTransactionSummaryDto[];
    thumbnail?: string;
    client: Client;
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

    return EmbedBuilderService.simple({
      description: `${description}\n${information}\n${debtors}`,
      title,
      thumbnail,
      variant: 'warning',
      client,
    });
  }

  private static generateChatgptSummarySections({
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

    const longestUsernameLength = this.getLongestUsernameLength({
      transactionSummaries,
    });

    const informationSection = EmbedBuilderService.generateSection({
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

    const summarySection = EmbedBuilderService.generateSection({
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

  private static generateChatgptUserSummary({
    transactionSummary,
    longestUsernameLength,
  }: {
    transactionSummary: DiscordChatgptTransactionSummaryDto;
    longestUsernameLength: number;
  }): string {
    const icon: string = transactionSummary.amount >= 0 ? '✅' : '❌';
    const username: string = transactionSummary.discordUser?.username ?? '';
    const userMention: string = `<@!${transactionSummary.discordUser?.userId ?? ''}>`;
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

  private static getLongestUsernameLength({
    transactionSummaries,
  }: {
    transactionSummaries: DiscordChatgptTransactionSummaryDto[];
  }): number {
    let longestUsernameLength: number = 0;
    transactionSummaries.forEach((t) => {
      if (t.discordUser?.username?.length ?? 0 > longestUsernameLength) {
        longestUsernameLength = t.discordUser?.username?.length ?? 0;
      }
    });
    return longestUsernameLength;
  }
}
