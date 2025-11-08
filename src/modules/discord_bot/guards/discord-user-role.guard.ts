import { DiscordUserRole } from '@Enums/discord-user-role.enum';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DiscordUsersService } from '@Services/discord-users.service';
import {
  ChatInputCommandInteraction,
  MessageFlags,
  StringSelectMenuInteraction,
} from 'discord.js';
import { SlashCommandContext, StringSelectContext } from 'necord';
import { BOT_COMMANDS_CONFIG } from '../configs/bot-commands.config';
import { REQUIRES_DISCORD_USER_ROLE } from '../decorators/requires-discord-user-role.decorator';
import { EmbedBuilderService } from '../services/embed-builder.service';

@Injectable()
export class DiscordUserRoleGuard implements CanActivate {
  private readonly logger = new Logger(this.constructor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly discordUsersService: DiscordUsersService,
    private readonly embedBuilderService: EmbedBuilderService,
  ) {}

  static get embedTitle(): string {
    return 'Authorization';
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredDiscordUserRoles = this.reflector.get<DiscordUserRole[]>(
      REQUIRES_DISCORD_USER_ROLE,
      context.getHandler(),
    );

    if (!requiredDiscordUserRoles || requiredDiscordUserRoles.length === 0) {
      return true;
    }

    const discordInteraction = this.getDiscordInteraction(context);

    if (!discordInteraction) {
      return false;
    }

    const discordUser = await this.discordUsersService.findByUserId(
      discordInteraction.user.id,
    );

    if (discordUser.isErr()) {
      return this.forbidWithMessage('User not found.', discordInteraction);
    }

    const discordUserRoles = discordUser.value.roles;

    const isDiscordUserSuperAdmin = discordUserRoles.includes(
      DiscordUserRole.SUPER_ADMIN,
    );

    if (isDiscordUserSuperAdmin) {
      return true;
    }

    const hasDiscordUserRequiredRole = requiredDiscordUserRoles.some(
      (requiredDiscordUserRole) =>
        discordUserRoles.includes(requiredDiscordUserRole),
    );

    return hasDiscordUserRequiredRole
      ? true
      : await this.forbidWithMessage(
          'You do not have permission to do this.',
          discordInteraction,
        );
  }

  private getDiscordInteraction(
    context: ExecutionContext,
  ): ChatInputCommandInteraction | StringSelectMenuInteraction | null {
    const args = context.getArgs() ?? [];

    if (!args.length) {
      return null;
    }

    const commandContext = args[0] as SlashCommandContext | StringSelectContext;

    const interaction = commandContext.find(
      (arg) =>
        arg instanceof ChatInputCommandInteraction ||
        arg instanceof StringSelectMenuInteraction,
    );

    return interaction ?? null;
  }

  private async forbidWithMessage(
    description: string,
    interaction: ChatInputCommandInteraction | StringSelectMenuInteraction,
  ): Promise<false> {
    await interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [
        this.embedBuilderService.simple({
          description,
          title: DiscordUserRoleGuard.embedTitle,
          variant: 'error',
          thumbnail: BOT_COMMANDS_CONFIG.embed.thumbnail,
          logger: this.logger,
        }),
      ],
    });

    return false;
  }
}
