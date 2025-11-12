import { BOT_COMMANDS_CONFIG } from '@Constants/discord/bot-commands.constant';
import { DiscordUserDto } from '@DTOs/discord-user.dto';
import { DiscordUserRole } from '@Enums/discord/discord-user-role.enum';
import { ErrorCode } from '@Enums/error-code.enum';
import { Injectable, Logger } from '@nestjs/common';
import { DiscordUsersService } from '@Services/discord-users.service';
import { EmbedVariant } from '@Types/discord/embed-variant.type';
import { EmbedBuilder } from 'discord.js';
import { EmbedBuilderService } from './embed-builder.service';

@Injectable()
export class BotCommandsService {
  private readonly logger = new Logger(this.constructor.name);

  constructor(
    private readonly discordUsersService: DiscordUsersService,
    private readonly embedBuilderService: EmbedBuilderService,
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
      id: userId,
      username,
      roles: [DiscordUserRole.SUPER_ADMIN],
    });

    if (
      newSuperAdminUser.isErr() &&
      newSuperAdminUser.error === ErrorCode.DISCORD_USER_EXISTS
    ) {
      const newSuperAdminUserDto = new DiscordUserDto({
        id: userId,
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
    return this.embedBuilderService.simple({
      description: description,
      title: BOT_COMMANDS_CONFIG.embed.title,
      thumbnail: BOT_COMMANDS_CONFIG.embed.thumbnail,
      variant: variant,
      logger: this.logger,
    });
  }
}
