import { CHATGPT_COMMANDS_CONFIG } from '@Constants/discord/chatgpt-commands.constant';
import { ERROR_CODE_MESSAGE_MAP } from '@Constants/error-messages.constant';
import { DiscordUserDto } from '@DTOs/discord-user.dto';
import { DiscordUserRole } from '@Enums/discord/discord-user-role.enum';
import { Injectable, Logger } from '@nestjs/common';
import { DiscordUsersService } from '@Services/discord-users.service';
import { EmbedVariant } from '@Types/discord/embed-variant.type';
import { EmbedBuilder } from 'discord.js';
import { ChatgptEmbedBuilderService } from './chatgpt-embed-builder.service';

@Injectable()
export class UserCommandsService {
  private readonly logger = new Logger(this.constructor.name);

  constructor(
    private readonly discordUsersService: DiscordUsersService,
    private readonly embedBuilderService: ChatgptEmbedBuilderService,
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
        username,
        roles: [DiscordUserRole.CHATGPT],
      }),
    );

    if (newUser.isErr()) {
      return this.generateSimpleEmbed({
        description: ERROR_CODE_MESSAGE_MAP[newUser.error],
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
        description: ERROR_CODE_MESSAGE_MAP[existingUser.error],
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
