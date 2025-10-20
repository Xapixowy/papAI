import { DiscordUserRole } from '@Enums/discord-user-role.enum';
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
      'https://static.wikia.nocookie.net/fortnite/images/c/cd/MrBeast_%28v28.01%29_-_Outfit_-_Fortnite.png/revision/latest?cb=20231208014631',
  },
  commands: {
    config: {
      name: 'config',
      description: 'Config commands',
      commands: {
        getGMGIFQuery: {
          name: 'get-gm-gif-query',
          description: 'Gets the Good Morning GIF query',
          userRoles: [],
        },
        setGMGIFQuery: {
          name: 'set-gm-gif-query',
          description: 'Sets the Good Morning GIF query',
          userRoles: [],
        },
        getSystemPrompt: {
          name: 'get-system-prompt',
          description: 'Gets the system prompt for mention replies',
          userRoles: [DiscordUserRole.SUPER_ADMIN],
        },
        setSystemPrompt: {
          name: 'set-system-prompt',
          description: 'Sets the system prompt for mention replies',
          userRoles: [DiscordUserRole.SUPER_ADMIN],
        },
      },
    },
  },
};
