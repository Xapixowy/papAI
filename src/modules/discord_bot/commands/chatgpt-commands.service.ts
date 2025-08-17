import { DiscordUserRole } from '@Enums/discord-user-role.enum';
import { Injectable, UseGuards } from '@nestjs/common';
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
  constructor(private readonly discordUsersService: DiscordUsersService) {
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
}
