import {
  CommandConfigCommand,
  CommandConfigGroup,
  CommandConfigParentGroup,
} from '@Types/discord/command-config.type';

export const STEAM_COMMANDS_CONFIG: CommandConfigParentGroup<
  CommandConfigGroup<CommandConfigCommand>
> = {
  name: 'steam',
  description: 'Steam commands',
  embed: {
    title: 'Steam',
    thumbnail:
      'https://cdn.freebiesupply.com/images/large/2x/steam-logo-transparent.png',
  },
  commands: {
    observer: {
      name: 'observer',
      description: 'Steam observer commands',
      commands: {
        add: {
          name: 'add',
          description: 'Add a Steam observer for a user.',
          userRoles: [],
        },
        list: {
          name: 'list',
          description: 'List your Steam observers.',
          userRoles: [],
        },
        remove: {
          name: 'remove',
          description: 'Remove a Steam observer.',
          userRoles: [],
        },
        update: {
          name: 'update',
          description:
            'Manually trigger a game library update for your observed users.',
          userRoles: [],
        },
      },
    },
  },
};
