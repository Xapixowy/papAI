import { DiscordUserRole } from '@Enums/discord-user-role.enum';
import {
  CommandConfigCommand,
  CommandConfigParentGroup,
} from '../types/command-config.type';

export const SONARR_COMMANDS_CONFIG: CommandConfigParentGroup<CommandConfigCommand> =
  {
    name: 'sonarr',
    description: 'Sonarr (tv shows downloader) commands',
    embed: {
      title: 'Sonarr',
      thumbnail:
        'https://raw.githubusercontent.com/linuxserver/docker-templates/master/linuxserver.io/img/sonarr-banner.png',
    },
    commands: {
      diskSpace: {
        name: 'disk-space',
        description:
          'Shows information about free disk space of the Sonarr server',
        userRoles: [DiscordUserRole.SONARR],
      },
      currentDownloads: {
        name: 'current-downloads',
        description:
          'Shows information about current downloads queue of the Sonarr server',
        userRoles: [DiscordUserRole.SONARR],
      },
    },
  };
