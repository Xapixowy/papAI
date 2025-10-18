import { BooleanOption } from 'necord';

export class SendToAllReminderChannelsOption {
  @BooleanOption({
    name: 'send-to-all-reminder-channels',
    description:
      'Should the message be sent to all reminder channels instead of current channel',
  })
  sendToAllReminderChannels: boolean | null;
}
