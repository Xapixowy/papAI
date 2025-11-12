import { BooleanOption } from 'necord';

export class EphemeralOption {
  @BooleanOption({
    name: 'ephemeral',
    description:
      'Should the message be visible only to the user who invoked the command',
  })
  ephemeral: boolean | null;
}
