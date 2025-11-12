import { CHATGPT_COMMANDS_CONFIG } from '@Constants/discord/chatgpt-commands.constant';
import { ERROR_CODE_MESSAGE_MAP } from '@Constants/error-messages.constant';
import { DiscordUserDto } from '@DTOs/discord-user.dto';
import { CurrencyCode } from '@Enums/currency-code.enum';
import { DiscordSettingKey } from '@Enums/discord/discord-setting-key.enum';
import { DiscordUserRole } from '@Enums/discord/discord-user-role.enum';
import { Injectable, Logger } from '@nestjs/common';
import { DiscordSettingsService } from '@Services/discord-settings.service';
import { DiscordUsersService } from '@Services/discord-users.service';
import { DiscordChatgptReminderChannel } from '@Types/discord/chatgpt';
import { EmbedVariant } from '@Types/discord/embed-variant.type';
import { EmbedBuilder } from 'discord.js';
import { ChatgptEmbedBuilderService } from './chatgpt-embed-builder.service';

@Injectable()
export class ConfigCommandsService {
  private readonly logger = new Logger(this.constructor.name);

  constructor(
    private readonly discordUsersService: DiscordUsersService,
    private readonly discordSettingsService: DiscordSettingsService,
    private readonly embedBuilderService: ChatgptEmbedBuilderService,
  ) {}

  public async configListHandler(): Promise<EmbedBuilder> {
    const chatgptCurrency =
      await this.discordSettingsService.getValueByKey<CurrencyCode>({
        key: DiscordSettingKey.CHATGPT_CURRENCY,
      });

    if (chatgptCurrency.isErr()) {
      return this.generateSimpleEmbed({
        description: ERROR_CODE_MESSAGE_MAP[chatgptCurrency.error],
        variant: 'error',
      });
    }

    const chatgptPrice =
      await this.discordSettingsService.getValueByKey<number>({
        key: DiscordSettingKey.CHATGPT_PRICE,
      });

    if (chatgptPrice.isErr()) {
      return this.generateSimpleEmbed({
        description: ERROR_CODE_MESSAGE_MAP[chatgptPrice.error],
        variant: 'error',
      });
    }

    const chatgptPaymentDate =
      await this.discordSettingsService.getValueByKey<number>({
        key: DiscordSettingKey.CHATGPT_PAYMENT_DATE,
      });

    if (chatgptPaymentDate.isErr()) {
      return this.generateSimpleEmbed({
        description: ERROR_CODE_MESSAGE_MAP[chatgptPaymentDate.error],
        variant: 'error',
      });
    }

    const chatgptReminderDate =
      await this.discordSettingsService.getValueByKey<string>({
        key: DiscordSettingKey.CHATGPT_REMINDER_DATE,
      });

    if (chatgptReminderDate.isErr()) {
      return this.generateSimpleEmbed({
        description: ERROR_CODE_MESSAGE_MAP[chatgptReminderDate.error],
        variant: 'error',
      });
    }

    const chatgptReminderChannels =
      await this.discordSettingsService.getValueByKey<
        DiscordChatgptReminderChannel[]
      >({
        key: DiscordSettingKey.CHATGPT_REMINDER_CHANNELS,
      });

    if (chatgptReminderChannels.isErr()) {
      return this.generateSimpleEmbed({
        description: ERROR_CODE_MESSAGE_MAP[chatgptReminderChannels.error],
        variant: 'error',
      });
    }

    const chatgptUsers = await this.discordUsersService.findAllByRoles([
      DiscordUserRole.CHATGPT,
    ]);

    if (chatgptUsers.isErr()) {
      return this.generateSimpleEmbed({
        description: ERROR_CODE_MESSAGE_MAP[chatgptUsers.error],
        variant: 'error',
      });
    }

    return this.embedBuilderService.chatgptConfigList({
      description: 'List of ChatGPT settings.',
      chatgptCurrency: chatgptCurrency.value,
      chatgptPrice: chatgptPrice.value,
      chatgptPaymentDate: chatgptPaymentDate.value,
      chatgptReminderDate: chatgptReminderDate.value,
      chatgptReminderChannels: chatgptReminderChannels.value,
      chatgptUsers: chatgptUsers.value.map((u) => DiscordUserDto.fromEntity(u)),
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
