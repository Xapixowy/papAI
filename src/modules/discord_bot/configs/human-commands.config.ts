import {
  CommandConfigCommand,
  CommandConfigGroup,
  CommandConfigParentGroup,
} from '../types/command-config.type';

export const HUMAN_COMMANDS_CONFIG: CommandConfigParentGroup<
  CommandConfigGroup<CommandConfigCommand>
> = {
  name: 'human',
  description: 'Human commands',
  embed: {
    title: 'Human',
    thumbnail:
      'https://cdn.discordapp.com/avatars/1402731157384069161/38e74af3fc1ca26500e9a2885d6eaa99?size=256',
  },
  commands: {
    config: {
      name: 'config',
      description: 'Config commands',
      commands: {
        getGMGIFQuery: {
          name: 'get-gm-gif-query',
          description: 'Gets the GM GIF query',
          userRoles: [],
        },
        setGMGIFQuery: {
          name: 'set-gm-gif-query',
          description: 'Sets a GIF query for the GM command',
          userRoles: [],
        },
      },
    },
  },
};
