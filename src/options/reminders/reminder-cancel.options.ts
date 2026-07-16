import { StringOption } from 'necord';

export class ReminderCancelOptions {
  @StringOption({
    name: 'id',
    description: 'Reminder id, as shown by /remind list',
    required: true,
  })
  id: string;
}
