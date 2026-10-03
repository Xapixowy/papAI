import { DiscordUserRole } from '@Enums/discord/discord-user-role.enum';
import {
  CommandConfigCommand,
  CommandConfigParentGroup,
} from '@Types/discord/command-config.type';

export const CTFD_COMMANDS_CONFIG: CommandConfigParentGroup<CommandConfigCommand> =
  {
    name: 'ctfd',
    description: 'CTFd commands',
    embed: {
      title: 'CTFd',
      thumbnail: 'https://cdn-icons-png.flaticon.com/512/3273/3273297.png',
    },
    commands: {
      set_channel: {
        name: 'set_channel',
        description: 'Sets the channel for CTFd place updates.',
        userRoles: [DiscordUserRole.SUPER_ADMIN],
      },
    },
  };
