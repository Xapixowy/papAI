import { DiscordUserRole } from '@Enums/discord-user-role.enum';
import {
  CommandConfigCommand,
  CommandConfigGroup,
  CommandConfigParentGroup,
} from '../types/command-config.type';

export const CHATGPT_COMMANDS_CONFIG: CommandConfigParentGroup<
  CommandConfigGroup<CommandConfigCommand>
> = {
  name: 'chatgpt',
  description: 'ChatGPT commands',
  embed: {
    title: 'ChatGPT',
    thumbnail: 'https://companieslogo.com/img/orig/openai.D-519073dc.png',
  },
  commands: {
    user: {
      name: 'user',
      description: 'User commands',
      commands: {
        add: {
          name: 'add',
          description: 'Adds a new user to the ChatGPT',
          userRoles: [DiscordUserRole.SUPER_ADMIN],
        },
        remove: {
          name: 'remove',
          description: 'Removes a user from the ChatGPT',
          userRoles: [DiscordUserRole.SUPER_ADMIN],
        },
      },
    },
    set: {
      name: 'set',
      description: 'Set setting commands',
      commands: {
        price: {
          name: 'price',
          description: 'Sets the price of ChatGPT',
          userRoles: [DiscordUserRole.SUPER_ADMIN],
        },
        currency: {
          name: 'currency',
          description: 'Sets the currency of ChatGPT',
          userRoles: [DiscordUserRole.SUPER_ADMIN],
        },
        reminder: {
          name: 'reminder',
          description: 'Sets the reminder date of ChatGPT',
          userRoles: [DiscordUserRole.SUPER_ADMIN],
        },
        payment: {
          name: 'payment',
          description: 'Sets the payment date of ChatGPT',
          userRoles: [DiscordUserRole.SUPER_ADMIN],
        },
        reminderChannel: {
          name: 'reminder-channel',
          description: 'Sets the reminder channel of ChatGPT',
          userRoles: [DiscordUserRole.SUPER_ADMIN],
        },
      },
    },
    transaction: {
      name: 'transaction',
      description: 'Transaction commands',
      commands: {
        add: {
          name: 'add',
          description: 'Adds a transaction to the ChatGPT',
          userRoles: [DiscordUserRole.CHATGPT],
        },
        remove: {
          name: 'remove',
          description: 'Removes a transaction from the ChatGPT',
          userRoles: [DiscordUserRole.CHATGPT],
        },
        history: {
          name: 'history',
          description: 'Shows the transaction history of the user',
          userRoles: [DiscordUserRole.CHATGPT],
        },
        summary: {
          name: 'summary',
          description:
            'Shows the transaction summary for the last payment period',
          userRoles: [DiscordUserRole.CHATGPT],
        },
        generateSummary: {
          name: 'generate-summary',
          description:
            'Generates a transaction summary for the last payment period',
          userRoles: [DiscordUserRole.SUPER_ADMIN],
        },
        remind: {
          name: 'remind',
          description: 'Sends a reminder message in the current channel',
          userRoles: [DiscordUserRole.CHATGPT],
        },
      },
    },
  },
};
