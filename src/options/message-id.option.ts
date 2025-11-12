import { StringOption } from 'necord';

export class MessageIdOption {
  @StringOption({
    name: 'id',
    description: 'The ID of the message',
    required: true,
  })
  messageId: string;
}
