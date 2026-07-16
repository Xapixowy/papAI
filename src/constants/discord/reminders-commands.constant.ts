export const REMINDER_KEYWORDS = ['remind', 'przypomni'];

export const REMINDER_COMMANDS_CONFIG = {
  name: 'reminder',
  description: 'Schedule and manage reminders',
  commands: {
    create: {
      name: 'create',
      description: 'Create a new reminder',
    },
    list: {
      name: 'list',
      description: 'List your pending reminders',
    },
    cancel: {
      name: 'cancel',
      description: 'Cancel a pending reminder',
    },
  },
} as const;
