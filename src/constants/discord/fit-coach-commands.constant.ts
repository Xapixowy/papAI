export const FIT_COACH_COMMANDS_CONFIG = {
  name: 'fit-coach',
  description: 'FitCoach — meal and nutrition tracking',
  commands: {
    meal: {
      name: 'meal',
      description: 'Manage your meals',
      commands: {
        add: {
          name: 'add',
          description: 'Add a meal entry',
        },
        list: {
          name: 'list',
          description: 'List meals for a day',
        },
        remove: {
          name: 'remove',
          description: 'Remove a meal entry',
        },
      },
    },
    summary: {
      name: 'summary',
      description: 'View nutrition summaries',
      commands: {
        day: {
          name: 'day',
          description: 'Daily summary with per-meal breakdown',
        },
        week: {
          name: 'week',
          description: 'Weekly nutrition summary',
        },
        month: {
          name: 'month',
          description: 'Monthly nutrition summary',
        },
        year: {
          name: 'year',
          description: 'Yearly nutrition summary',
        },
      },
    },
    settings: {
      name: 'settings',
      description: 'Configure FitCoach preferences',
      commands: {
        timezone: {
          name: 'timezone',
          description: 'Configure your timezone via interactive form',
        },
        mealTimes: {
          name: 'meal-times',
          description: 'Configure meal time ranges via interactive form',
        },
        configure: {
          name: 'configure',
          description:
            'Configure timezone and meal time ranges via interactive forms',
        },
      },
    },
  },
} as const;
