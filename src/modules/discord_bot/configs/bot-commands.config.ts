import {
  CommandConfigCommand,
  CommandConfigParentGroup,
} from '../types/command-config.type';

export const BOT_COMMANDS_CONFIG: CommandConfigParentGroup<CommandConfigCommand> =
  {
    name: 'bot',
    description: 'Bot commands',
    embed: {
      title: 'Bot',
      thumbnail:
        'https://cdn.discordapp.com/avatars/1402731157384069161/38e74af3fc1ca26500e9a2885d6eaa99?size=256',
    },
    commands: {
      initialize: {
        name: 'initialize',
        description:
          'Initialize the bot (the user who executes this command will become the SuperAdmin).',
        userRoles: [],
      },
    },
  };
