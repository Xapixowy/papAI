import { DiscordUserRole } from '@Enums/discord/discord-user-role.enum';
import {
  CommandConfigCommand,
  CommandConfigGroup,
  CommandConfigParentGroup,
} from '@Types/discord/command-config.type';

export const ADMIN_COMMANDS_CONFIG: CommandConfigParentGroup<
  CommandConfigGroup<CommandConfigCommand>
> = {
  name: 'admin',
  description: 'Admin commands',
  embed: {
    title: 'Admin',
  },
  commands: {
    cron: {
      name: 'cron',
      description: 'Cron commands',
      commands: {
        list: {
          name: 'list',
          description: 'List all registered cron jobs.',
          userRoles: [DiscordUserRole.SUPER_ADMIN],
        },
      },
    },
  },
};
