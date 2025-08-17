import { DiscordUserRole } from '@Enums/discord-user-role.enum';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DiscordUsersService } from '@Services/discord-users.service';
import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { SlashCommandContext } from 'necord';
import { REQUIRES_DISCORD_USER_ROLE } from '../decorators/requires-discord-user-role.decorator';
import { EmbedBuilderService } from '../services/embed-builder.service';

@Injectable()
export class DiscordUserRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly discordUsersService: DiscordUsersService,
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

    const discordCommandInteraction =
      this.getDiscordChatInputCommandInteraction(context);

    if (!discordCommandInteraction) {
      return false;
    }

    const discordUser = await this.discordUsersService.findByUserId(
      discordCommandInteraction.user.id,
    );

    if (discordUser.isErr()) {
      return this.forbidWithMessage(
        'User not found.',
        discordCommandInteraction,
      );
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
          discordCommandInteraction,
        );
  }

  private getDiscordChatInputCommandInteraction(
    context: ExecutionContext,
  ): ChatInputCommandInteraction | null {
    const args = context.getArgs() ?? [];

    if (!args.length) {
      return null;
    }

    const commandContext = args[0] as SlashCommandContext;

    const interaction = commandContext.find(
      (arg) => arg instanceof ChatInputCommandInteraction,
    );

    return interaction ?? null;
  }

  private async forbidWithMessage(
    message: string,
    interaction: ChatInputCommandInteraction,
  ): Promise<false> {
    await interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [
        EmbedBuilderService.simpleError({
          message,
          title: DiscordUserRoleGuard.embedTitle,
          interaction,
        }),
      ],
    });

    return false;
  }
}
