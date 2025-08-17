import { DiscordSettingKey } from '@Enums/discord-setting-key.enum';
import { DiscordUserRole } from '@Enums/discord-user-role.enum';
import { Injectable, UseGuards } from '@nestjs/common';
import { DiscordSettingsService } from '@Services/discord-settings.service';
import { DiscordUsersService } from '@Services/discord-users.service';
import {
  GatewayIntentBits,
  InteractionResponse,
  MessageFlags,
} from 'discord.js';
import {
  Context,
  createCommandGroupDecorator,
  Options,
  type SlashCommandContext,
  Subcommand,
} from 'necord';
import { DiscordUserDto } from 'src/dtos/discord-user.dto';
import { RequiresDiscordUserRole } from '../decorators/requires-discord-user-role.decorator';
import { DiscordUserRoleGuard } from '../guards/discord-user-role.guard';
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
  constructor(
    private readonly discordUsersService: DiscordUsersService,
    private readonly discordSettingsService: DiscordSettingsService,
  ) {
    super();
  }

  static get botIntents(): GatewayIntentBits[] {
    return [GatewayIntentBits.Guilds];
  }

  static get embedTitle(): string {
    return 'ChatGPT';
  }

  @Subcommand({
    name: 'add',
    description: 'Adds a new user to the ChatGPT',
  })
  @RequiresDiscordUserRole(DiscordUserRole.CHATGPT)
  public async onAddCommand(
    @Context() [interaction]: SlashCommandContext,
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
              interaction,
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
            message: 'User added to ChatGPT.',
            interaction,
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
            interaction,
          }),
        ],
      });
    }

    return interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [
        EmbedBuilderService.simpleSuccess({
          title: ChatgptCommandsService.embedTitle,
          message: 'User added to ChatGPT.',
          interaction,
        }),
      ],
    });
  }

  @Subcommand({
    name: 'remove',
    description: 'Removes a user from the ChatGPT',
  })
  @RequiresDiscordUserRole(DiscordUserRole.CHATGPT)
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
            interaction,
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
            interaction,
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
            message: 'User removed from ChatGPT.',
            interaction,
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
          message: 'User removed from ChatGPT.',
          interaction,
        }),
      ],
    });
  }

  @Subcommand({
    name: 'set-price',
    description: 'Sets the price of ChatGPT',
  })
  @RequiresDiscordUserRole(DiscordUserRole.CHATGPT)
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
            interaction,
          }),
        ],
      });
    }

    return interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [
        EmbedBuilderService.simpleSuccess({
          title: ChatgptCommandsService.embedTitle,
          message: 'Price set.',
          interaction,
        }),
      ],
    });
  }

  @Subcommand({
    name: 'set-currency',
    description: 'Sets the currency of ChatGPT',
  })
  @RequiresDiscordUserRole(DiscordUserRole.CHATGPT)
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
            interaction,
          }),
        ],
      });
    }

    return interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [
        EmbedBuilderService.simpleSuccess({
          title: ChatgptCommandsService.embedTitle,
          message: 'Currency set.',
          interaction,
        }),
      ],
    });
  }

  @Subcommand({
    name: 'set-reminder-date',
    description: 'Sets the reminder date of ChatGPT',
  })
  @RequiresDiscordUserRole(DiscordUserRole.CHATGPT)
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
            interaction,
          }),
        ],
      });
    }

    return interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [
        EmbedBuilderService.simpleSuccess({
          title: ChatgptCommandsService.embedTitle,
          message: 'Reminder date set.',
          interaction,
        }),
      ],
    });
  }

  @Subcommand({
    name: 'set-payment-date',
    description: 'Sets the payment date of ChatGPT',
  })
  @RequiresDiscordUserRole(DiscordUserRole.CHATGPT)
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
            interaction,
          }),
        ],
      });
    }

    return interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [
        EmbedBuilderService.simpleSuccess({
          title: ChatgptCommandsService.embedTitle,
          message: 'Payment date set.',
          interaction,
        }),
      ],
    });
  }
}
