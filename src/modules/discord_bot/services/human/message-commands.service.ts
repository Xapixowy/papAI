import { ErrorCodeMessageMap } from '@Constants/error-messages.constant';
import { DiscordUserRole } from '@Enums/discord-user-role.enum';
import { HUMAN_COMMANDS_CONFIG } from '@Modules/discord_bot/configs/human-commands.config';
import { EmbedVariant } from '@Modules/discord_bot/types/embed-variant.type';
import { Injectable, Logger } from '@nestjs/common';
import { DiscordMessageService } from '@Services/discord-message.service';
import { DiscordUsersService } from '@Services/discord-users.service';
import { EmbedBuilder } from 'discord.js';
import { EmbedBuilderService } from '../embed-builder.service';

@Injectable()
export class MessageCommandsService {
  private readonly logger = new Logger(this.constructor.name);

  constructor(
    private readonly embedBuilderService: EmbedBuilderService,
    private readonly discordMessageService: DiscordMessageService,
    private readonly discordUsersService: DiscordUsersService,
  ) {}

  public async messageRemoveHandler({
    messageId,
    userId,
  }: {
    messageId: string;
    userId: string;
  }): Promise<EmbedBuilder> {
    const messageToDelete =
      await this.discordMessageService.findById(messageId);

    if (messageToDelete.isErr()) {
      return this.generateSimpleEmbed({
        description: ErrorCodeMessageMap[messageToDelete.error],
        variant: 'error',
      });
    }

    const messageToDeleteValue = messageToDelete.value;
    let hasUserPermissionToDelete = false;

    if (messageToDeleteValue.discordUserId === userId) {
      hasUserPermissionToDelete = true;
    }

    if (!hasUserPermissionToDelete) {
      const superAdminUsers = await this.discordUsersService.findAllByRoles([
        DiscordUserRole.SUPER_ADMIN,
      ]);

      if (superAdminUsers.isErr()) {
        return this.generateSimpleEmbed({
          description: ErrorCodeMessageMap[superAdminUsers.error],
          variant: 'error',
        });
      }

      const superAdminUsersValue = superAdminUsers.value;

      hasUserPermissionToDelete = superAdminUsersValue.some(
        (superAdminUser) => superAdminUser.id === userId,
      );
    }

    if (!hasUserPermissionToDelete) {
      return this.generateSimpleEmbed({
        description: 'You do not have permission to delete this message.',
        variant: 'error',
      });
    }

    const deleteMessageResult =
      await this.discordMessageService.deleteById(messageId);

    if (deleteMessageResult.isErr()) {
      return this.generateSimpleEmbed({
        description: ErrorCodeMessageMap[deleteMessageResult.error],
        variant: 'error',
      });
    }

    return this.generateSimpleEmbed({
      description: 'Message removed.',
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
      description: description,
      title: HUMAN_COMMANDS_CONFIG.embed.title,
      thumbnail: HUMAN_COMMANDS_CONFIG.embed.thumbnail,
      variant: variant,
      logger: this.logger,
    });
  }
}
