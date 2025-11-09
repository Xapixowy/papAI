import { ErrorCodeMessageMap } from '@Constants/error-messages.constant';
import { DiscordUserRole } from '@Enums/discord-user-role.enum';
import { CHATGPT_COMMANDS_CONFIG } from '@Modules/discord_bot/configs/chatgpt-commands.config';
import { EmbedVariant } from '@Modules/discord_bot/types/embed-variant.type';
import { Injectable, Logger } from '@nestjs/common';
import { DiscordUsersService } from '@Services/discord-users.service';
import { EmbedBuilder } from 'discord.js';
import { DiscordUserDto } from 'src/dtos/discord-user.dto';
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
        description: ErrorCodeMessageMap[newUser.error],
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
        description: ErrorCodeMessageMap[existingUser.error],
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
