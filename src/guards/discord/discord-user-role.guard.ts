import { DiscordUserRole } from '@Enums/discord/discord-user-role.enum';
import { DiscordUserRoleForbiddenException } from '@Exceptions/discord/discord-user-role-forbidden.exception';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DiscordUsersService } from '@Services/discord-users.service';
import { getDiscordInteractionFromArgs } from '@Utils/functions/get-discord-interction-from-args.function';
import { REQUIRES_DISCORD_USER_ROLE } from '../../decorators/requires-discord-user-role.decorator';

@Injectable()
export class DiscordUserRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly discordUsersService: DiscordUsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredDiscordUserRoles = this.reflector.get<DiscordUserRole[]>(
      REQUIRES_DISCORD_USER_ROLE,
      context.getHandler(),
    );

    if (!requiredDiscordUserRoles || requiredDiscordUserRoles.length === 0) {
      return true;
    }

    const discordInteraction = getDiscordInteractionFromArgs(context.getArgs());

    if (!discordInteraction) {
      throw new DiscordUserRoleForbiddenException(
        'You do not have permission to do this.',
      );
    }

    const discordUser = await this.discordUsersService.findByUserId(
      discordInteraction.user.id,
    );

    if (discordUser.isErr()) {
      throw new DiscordUserRoleForbiddenException(
        'You do not have permission to do this.',
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

    if (!hasDiscordUserRequiredRole) {
      throw new DiscordUserRoleForbiddenException(
        'You do not have permission to do this.',
      );
    }

    return true;
  }
}
