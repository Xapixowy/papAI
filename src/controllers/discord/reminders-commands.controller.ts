import { REMINDER_COMMANDS_CONFIG } from '@Constants/discord/reminders-commands.constant';
import { InteractionContextType } from 'discord.js';
import { createCommandGroupDecorator } from 'necord';

export const ReminderCommandDecorator = createCommandGroupDecorator({
  name: REMINDER_COMMANDS_CONFIG.name,
  description: REMINDER_COMMANDS_CONFIG.description,
  contexts: [InteractionContextType.Guild, InteractionContextType.BotDM],
});
