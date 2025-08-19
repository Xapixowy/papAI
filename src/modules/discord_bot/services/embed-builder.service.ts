import { CurrencyCode } from '@Enums/currency-code.enum';
import { DateFormat } from '@Enums/date-format.enum';
import { EnvKey } from '@Enums/env-key.enum';
import { DISCORD_BOT_CONFIG } from '@Modules/discord_bot/discord-bot.config';
import { DateHelper } from '@Utils/helpers/date.helper';
import { APIEmbedField, Client, EmbedBuilder } from 'discord.js';
import { DiscordChatgptTransactionSummaryDto } from 'src/dtos/discord-chatgpt-transaction-summary.dto';

export class EmbedBuilderService {
  static chatgptReminder({
    title,
    description,
    fromDate,
    toDate,
    pricePerUser,
    totalPrice,
    currency,
    transactionSummaries,
    client,
  }: {
    title: string;
    description: string;
    fromDate: Date;
    toDate: Date;
    pricePerUser: number;
    totalPrice: number;
    currency: CurrencyCode;
    transactionSummaries: DiscordChatgptTransactionSummaryDto[];
    client: Client;
  }): EmbedBuilder {
    const embed = EmbedBuilderService.chatgptSummary({
      title,
      description,
      fromDate,
      toDate,
      pricePerUser,
      totalPrice,
      currency,
      transactionSummaries,
      client,
    });

    embed.setColor(DISCORD_BOT_CONFIG.colors.warning);
    embed.setTitle(title);
    embed.setDescription(description);

    const debtorsTransactionSummaries = transactionSummaries.filter(
      (t) => t.amount < 0,
    );

    if (debtorsTransactionSummaries.length === 0) {
      embed.spliceFields(1, 1, {
        name: '🙇 Debtors',
        value:
          'Congratulations! There are no debtors in the last payment period.',
      });
    } else {
      embed.spliceFields(1, 1, {
        name: '🙇 Debtors',
        value: debtorsTransactionSummaries
          .map(
            (transactionSummary) =>
              '- `' +
              `${transactionSummary.discordUser?.username ?? 'Unknown'} | ${transactionSummary.amount} ${transactionSummary.currency}` +
              '` ' +
              (transactionSummary.amount >= 0 ? '✅' : '❌'),
          )
          .join('\n'),
      });
    }

    return embed;
  }

  static chatgptSummary({
    title,
    description,
    fromDate,
    toDate,
    pricePerUser,
    totalPrice,
    currency,
    transactionSummaries,
    client,
  }: {
    title: string;
    description: string;
    fromDate: Date;
    toDate: Date;
    pricePerUser: number;
    totalPrice: number;
    currency: CurrencyCode;
    transactionSummaries: DiscordChatgptTransactionSummaryDto[];
    client: Client;
  }): EmbedBuilder {
    const fromDateString: string = DateHelper.formatDate(
      fromDate,
      DateFormat.DATE_TIME,
    );
    const toDateString: string = DateHelper.formatDate(
      toDate,
      DateFormat.DATE_TIME,
    );

    const informationField: APIEmbedField = {
      name: 'ℹ️  Information',
      value: [
        `- from: ` + '`' + fromDateString + '`',
        `- to: ` + '`' + toDateString + '`',
        `- users: ` + '`' + `${transactionSummaries.length}` + '`',
        `- price per user: ` + '`' + `${pricePerUser} ${currency}` + '`',
        `- total price: ` + '`' + `${totalPrice} ${currency}` + '`',
      ].join('\n'),
    };

    const summaryField: APIEmbedField = {
      name: '📊  Summary',
      value: transactionSummaries
        .map(
          (transactionSummary) =>
            '- `' +
            `${transactionSummary.discordUser?.username ?? 'Unknown'} | ${transactionSummary.amount} ${transactionSummary.currency}` +
            '` ' +
            (transactionSummary.amount >= 0 ? '✅' : '❌'),
        )
        .join('\n'),
    };

    return EmbedBuilderService.simpleSuccess({
      title,
      description,
      client,
    }).addFields([informationField, summaryField]);
  }

  static simpleError({
    message = 'Something went wrong.',
    title = 'Error',
    client,
  }: {
    message?: string;
    title?: string;
    client: Client;
  }): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(DISCORD_BOT_CONFIG.colors.error)
      .setTitle(title)
      .setDescription(message)
      .setTimestamp()
      .setFooter(this.generateFooter(client));
  }

  static simpleSuccess({
    description,
    title = 'Success',
    client,
  }: {
    description: string;
    title?: string;
    client: Client;
  }): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(DISCORD_BOT_CONFIG.colors.success)
      .setTitle(title)
      .setDescription(description)
      .setTimestamp()
      .setFooter(this.generateFooter(client));
  }

  static simpleInfo({
    description,
    title = 'Info',
    client,
  }: {
    description: string;
    title?: string;
    client: Client;
  }): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(DISCORD_BOT_CONFIG.colors.info)
      .setTitle(title)
      .setDescription(description)
      .setTimestamp()
      .setFooter(this.generateFooter(client));
  }

  private static generateFooter(client: Client): {
    text: string;
    iconURL: string | undefined;
  } {
    const { user } = client;
    const version = process.env[EnvKey.APP_VERSION];

    return {
      text:
        `${user?.displayName ?? DISCORD_BOT_CONFIG.botName}` +
        (version ? ` v${version}` : ''),
      iconURL: user?.displayAvatarURL() ?? undefined,
    };
  }
}
