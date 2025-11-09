import { ErrorCodeMessageMap } from '@Constants/error-messages.constant';
import { CurrencyCode } from '@Enums/currency-code.enum';
import { DiscordSettingKey } from '@Enums/discord-setting-key.enum';
import { CHATGPT_COMMANDS_CONFIG } from '@Modules/discord_bot/configs/chatgpt-commands.config';
import { EmbedVariant } from '@Modules/discord_bot/types/embed-variant.type';
import { Injectable, Logger } from '@nestjs/common';
import { DiscordSettingsService } from '@Services/discord-settings.service';
import { EmbedBuilder } from 'discord.js';
import { ChatgptEmbedBuilderService } from './chatgpt-embed-builder.service';
import { TransactionCommandsService } from './transaction-commands.service';

@Injectable()
export class SetCommandsService {
  private readonly logger = new Logger(this.constructor.name);

  constructor(
    private readonly discordSettingsService: DiscordSettingsService,
    private readonly embedBuilderService: ChatgptEmbedBuilderService,
    private readonly transactionCommandsService: TransactionCommandsService,
  ) {}

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
        description: ErrorCodeMessageMap[newPrice.error],
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
        description: ErrorCodeMessageMap[newCurrency.error],
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
        description: ErrorCodeMessageMap[newDate.error],
        variant: 'error',
      });
    }

    await this.transactionCommandsService.transactionRemindCronjobHandler();

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
        description: ErrorCodeMessageMap[newDate.error],
        variant: 'error',
      });
    }

    return this.generateSimpleEmbed({
      description: 'Payment date set.',
      variant: 'success',
    });
  }

  private generateSimpleEmbed({
    description,
    variant,
  }: {
    description: string;
    variant: EmbedVariant;
  }): EmbedBuilder {
    return this.embedBuilderService.simple({
      description,
      title: CHATGPT_COMMANDS_CONFIG.embed.title,
      thumbnail: CHATGPT_COMMANDS_CONFIG.embed.thumbnail,
      variant,
      logger: this.logger,
    });
  }
}
