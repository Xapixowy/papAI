import { DiscordUserRole } from '@Enums/discord/discord-user-role.enum';
import {
  CommandConfigCommand,
  CommandConfigGroup,
  CommandConfigParentGroup,
} from '@Types/discord/command-config.type';

export const GUILD_COMMANDS_CONFIG: CommandConfigParentGroup<
  CommandConfigGroup<CommandConfigCommand> | CommandConfigCommand
> = {
  name: 'guild',
  description: 'Guild commands',
  embed: {
    title: 'Guild',
    thumbnail: 'https://cdn-icons-png.flaticon.com/512/5968/5968756.png',
  },
  commands: {
    initialize: {
      name: 'initialize',
      description: 'Initialize the guild (creates the guild config).',
      userRoles: [],
    },
    list: {
      name: 'list',
      description: 'Lists the guild configs.',
      userRoles: [],
    },
    feature: {
      name: 'feature',
      description: 'Feature commands',
      commands: {
        add: {
          name: 'add',
          description: 'Adds a feature to the guild.',
          userRoles: [DiscordUserRole.SUPER_ADMIN],
        },
        remove: {
          name: 'remove',
          description: 'Removes a feature from the guild.',
          userRoles: [DiscordUserRole.SUPER_ADMIN],
        },
      },
    },
  },
};
