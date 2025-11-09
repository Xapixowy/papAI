import { ErrorCodeMessageMap } from '@Constants/error-messages.constant';
import { CurrencyCode } from '@Enums/currency-code.enum';
import { DiscordSettingKey } from '@Enums/discord-setting-key.enum';
import { DiscordUserRole } from '@Enums/discord-user-role.enum';
import { CHATGPT_COMMANDS_CONFIG } from '@Modules/discord_bot/configs/chatgpt-commands.config';
import { EmbedVariant } from '@Modules/discord_bot/types/embed-variant.type';
import { Injectable, Logger } from '@nestjs/common';
import { DiscordSettingsService } from '@Services/discord-settings.service';
import { DiscordUsersService } from '@Services/discord-users.service';
import { DiscordChatgptReminderChannel } from '@Types/discord/chatgpt';
import { EmbedBuilder } from 'discord.js';
import { DiscordUserDto } from 'src/dtos/discord-user.dto';
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
      await this.discordSettingsService.getValueByKey<CurrencyCode>(
        DiscordSettingKey.CHATGPT_CURRENCY,
      );

    if (chatgptCurrency.isErr()) {
      return this.generateSimpleEmbed({
        description: ErrorCodeMessageMap[chatgptCurrency.error],
        variant: 'error',
      });
    }

    const chatgptPrice =
      await this.discordSettingsService.getValueByKey<number>(
        DiscordSettingKey.CHATGPT_PRICE,
      );

    if (chatgptPrice.isErr()) {
      return this.generateSimpleEmbed({
        description: ErrorCodeMessageMap[chatgptPrice.error],
        variant: 'error',
      });
    }

    const chatgptPaymentDate =
      await this.discordSettingsService.getValueByKey<number>(
        DiscordSettingKey.CHATGPT_PAYMENT_DATE,
      );

    if (chatgptPaymentDate.isErr()) {
      return this.generateSimpleEmbed({
        description: ErrorCodeMessageMap[chatgptPaymentDate.error],
        variant: 'error',
      });
    }

    const chatgptReminderDate =
      await this.discordSettingsService.getValueByKey<string>(
        DiscordSettingKey.CHATGPT_REMINDER_DATE,
      );

    if (chatgptReminderDate.isErr()) {
      return this.generateSimpleEmbed({
        description: ErrorCodeMessageMap[chatgptReminderDate.error],
        variant: 'error',
      });
    }

    const chatgptReminderChannels =
      await this.discordSettingsService.getValueByKey<
        DiscordChatgptReminderChannel[]
      >(DiscordSettingKey.CHATGPT_REMINDER_CHANNELS);

    if (chatgptReminderChannels.isErr()) {
      return this.generateSimpleEmbed({
        description: ErrorCodeMessageMap[chatgptReminderChannels.error],
        variant: 'error',
      });
    }

    const chatgptUsers = await this.discordUsersService.findAllByRoles([
      DiscordUserRole.CHATGPT,
    ]);

    if (chatgptUsers.isErr()) {
      return this.generateSimpleEmbed({
        description: ErrorCodeMessageMap[chatgptUsers.error],
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
