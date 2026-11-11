import {
  BooleanOption,
  IntegerOption,
  MemberOption,
  StringOption,
} from 'necord';
import type { GuildMember } from 'discord.js';

export class BingoListOptions {
  @BooleanOption({
    name: 'include-archived',
    description: 'Include archived sets in the selection menu',
    required: false,
  })
  includeArchived?: boolean | null;
}
export class BingoCreateOptions {
  @StringOption({
    name: 'name',
    description: 'Name of the bingo set',
    required: true,
    min_length: 1,
    max_length: 80,
  })
  name: string;
}
export class BingoMemberOptions {
  @MemberOption({
    name: 'user',
    description: 'A member of this server',
    required: true,
  })
  user: GuildMember;
}
export class BingoAddPhraseOptions {
  @StringOption({
    name: 'text',
    description: 'Phrase to add to the selected set',
    required: true,
    min_length: 1,
    max_length: 80,
  })
  text: string;
}
export class BingoEditPhraseOptions {
  @StringOption({
    name: 'text',
    description: 'New text for the selected phrase',
    required: true,
    min_length: 1,
    max_length: 80,
  })
  text: string;
}
export class BingoStartOptions {
  @IntegerOption({
    name: 'size',
    description: 'Board size',
    required: true,
    choices: [
      { name: '3×3', value: 3 },
      { name: '4×4', value: 4 },
      { name: '5×5', value: 5 },
    ],
  })
  size: number;
}
