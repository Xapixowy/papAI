import { DiscordUserRole } from '@Enums/discord/discord-user-role.enum';
import {
  CommandConfigCommand,
  CommandConfigGroup,
  CommandConfigParentGroup,
} from '@Types/discord/command-config.type';

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
    systemPrompt: {
      name: 'system-prompt',
      description: 'System prompt commands',
      commands: {
        get: {
          name: 'get',
          description: 'Gets the system prompt for mention replies.',
          userRoles: [DiscordUserRole.SUPER_ADMIN],
        },
        set: {
          name: 'set',
          description: 'Sets the system prompt for mention replies.',
          userRoles: [DiscordUserRole.SUPER_ADMIN],
        },
      },
    },
    message: {
      name: 'message',
      description: 'Message commands',
      commands: {
        remove: {
          name: 'remove',
          description: 'Removes a message from random replies messages.',
          userRoles: [],
        },
      },
    },
  },
};
