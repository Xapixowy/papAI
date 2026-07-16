import { StringOption } from 'necord';

export class ReminderCreateOptions {
  @StringOption({
    name: 'content',
    description: 'What should I remind you about?',
    required: true,
  })
  content: string;

  @StringOption({
    name: 'time',
    description: 'Time in HH:MM 24h format (e.g. 18:30)',
    required: true,
  })
  time: string;

  @StringOption({
    name: 'date',
    description:
      'Date in YYYY-MM-DD format (optional, defaults to the next occurrence of the time)',
    required: false,
  })
  date?: string;
}
