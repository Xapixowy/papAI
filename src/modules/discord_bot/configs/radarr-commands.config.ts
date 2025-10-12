import { DiscordUserRole } from '@Enums/discord-user-role.enum';
import {
  CommandConfigCommand,
  CommandConfigParentGroup,
} from '../types/command-config.type';

export const RADARR_COMMANDS_CONFIG: CommandConfigParentGroup<CommandConfigCommand> =
  {
    name: 'radarr',
    description: 'Radarr (movie downloader) commands',
    embed: {
      title: 'Radarr',
      thumbnail: 'https://radarr.video/img/logo-full.png',
    },
    commands: {
      diskSpace: {
        name: 'disk-space',
        description:
          'Shows information about free disk space of the Radarr server',
        userRoles: [DiscordUserRole.RADARR],
      },
      currentDownloads: {
        name: 'current-downloads',
        description:
          'Shows information about current downloads queue of the Radarr server',
        userRoles: [DiscordUserRole.RADARR],
      },
    },
  };
