import { DiscordUserRole } from '@Enums/discord/discord-user-role.enum';
import { SetMetadata } from '@nestjs/common';

export const REQUIRES_DISCORD_USER_ROLE = 'requiresDiscordUserRole';

export const RequiresDiscordUserRole = (...roles: DiscordUserRole[]) =>
  SetMetadata(REQUIRES_DISCORD_USER_ROLE, roles);
