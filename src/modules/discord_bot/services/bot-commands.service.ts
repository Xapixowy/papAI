import { DiscordUserRole } from '@Enums/discord-user-role.enum';
import { ErrorCode } from '@Enums/error-code.enum';
import { Injectable } from '@nestjs/common';
import { DiscordUsersService } from '@Services/discord-users.service';
import { Client, EmbedBuilder } from 'discord.js';
import { DiscordUserDto } from 'src/dtos/discord-user.dto';
import { BOT_COMMANDS_CONFIG } from '../configs/bot-commands.config';
import { EmbedVariant } from '../types/embed-variant.type';
import { EmbedBuilderService } from './embed-builder.service';

@Injectable()
export class BotCommandsService {
  constructor(
    private readonly client: Client,
    private readonly discordUsersService: DiscordUsersService,
  ) {}

  public async initializeCommandHandler({
    userId,
    username,
  }: {
    userId: string;
    username: string;
  }): Promise<EmbedBuilder> {
    const superAdminUsers = await this.discordUsersService.findAllByRoles([
      DiscordUserRole.SUPER_ADMIN,
    ]);

    if (superAdminUsers.isOk()) {
      return this.generateSimpleEmbed({
        description: 'Bot is already initialized.',
        variant: 'error',
      });
    }

    const newSuperAdminUser = await this.discordUsersService.create({
      userId,
      username,
      roles: [DiscordUserRole.SUPER_ADMIN],
    });

    if (
      newSuperAdminUser.isErr() &&
      newSuperAdminUser.error === ErrorCode.DISCORD_USER_EXISTS
    ) {
      const newSuperAdminUserDto = new DiscordUserDto({
        userId,
        username,
        roles: [DiscordUserRole.SUPER_ADMIN],
      });

      await this.discordUsersService.update(newSuperAdminUserDto);
    }

    return this.generateSimpleEmbed({
      description: `Bot is now initialized. The user who executes this command will become the SuperAdmin.`,
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
    return EmbedBuilderService.simple({
      description: description,
      title: BOT_COMMANDS_CONFIG.embed.title,
      thumbnail: BOT_COMMANDS_CONFIG.embed.thumbnail,
      variant: variant,
      client: this.client,
    });
  }
}
