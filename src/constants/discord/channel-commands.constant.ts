import { DiscordUserRole } from '@Enums/discord/discord-user-role.enum';
import {
  CommandConfigCommand,
  CommandConfigGroup,
  CommandConfigParentGroup,
} from '@Types/discord/command-config.type';

export const CHANNEL_COMMANDS_CONFIG: CommandConfigParentGroup<
  CommandConfigGroup<CommandConfigCommand> | CommandConfigCommand
> = {
  name: 'channel',
  description: 'Channel commands',
  embed: {
    title: 'Channel',
    thumbnail: 'https://cdn-icons-png.flaticon.com/512/5968/5968756.png',
  },
  commands: {
    add: {
      name: 'add',
      description: 'Adds a channel to the guild.',
      userRoles: [DiscordUserRole.SUPER_ADMIN],
    },
    remove: {
      name: 'remove',
      description: 'Removes a channel from the guild.',
      userRoles: [DiscordUserRole.SUPER_ADMIN],
    },
    list: {
      name: 'list',
      description: 'Lists the channels of the guild.',
      userRoles: [DiscordUserRole.SUPER_ADMIN],
    },
    feature: {
      name: 'feature',
      description: 'Feature commands',
      commands: {
        set: {
          name: 'set',
          description: 'Sets the feature value for the channel.',
          userRoles: [DiscordUserRole.SUPER_ADMIN],
        },
      },
    },
  },
};
