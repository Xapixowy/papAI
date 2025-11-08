import {
  CommandConfigCommand,
  CommandConfigGroup,
  CommandConfigParentGroup,
} from '../types/command-config.type';

export const GOOD_MORNING_COMMANDS_CONFIG: CommandConfigParentGroup<
  CommandConfigGroup<CommandConfigCommand>
> = {
  name: 'good-morning',
  description: 'Good Morning commands',
  embed: {
    title: 'Good Morning',
    thumbnail: 'https://cdn-icons-png.flaticon.com/512/16994/16994118.png',
  },
  commands: {
    query: {
      name: 'query',
      description: 'Query commands',
      commands: {
        set: {
          name: 'set',
          description:
            'Sets the query that the bot will use to generate content.',
          userRoles: [],
        },
        get: {
          name: 'get',
          description: 'Gets the query that the bot uses to generate content.',
          userRoles: [],
        },
      },
    },
    channel: {
      name: 'channel',
      description: 'Channel commands',
      commands: {
        get: {
          name: 'add',
          description: 'Adds a channel for the bot to listen to.',
          userRoles: [],
        },
        set: {
          name: 'remove',
          description: 'Removes a channel the bot is listening to.',
          userRoles: [],
        },
      },
    },
  },
};
