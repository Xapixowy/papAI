import {
  BooleanOption,
  IntegerOption,
  MemberOption,
  StringOption,
} from 'necord';
import type { GuildMember } from 'discord.js';

export class BingoPageOptions {
  @IntegerOption({
    name: 'page',
    description: 'Page number',
    required: false,
    min_value: 1,
    max_value: 100000,
  })
  page?: number;
}
export class BingoListOptions extends BingoPageOptions {
  @BooleanOption({
    name: 'include-archived',
    description: 'Include archived sets',
    required: false,
  })
  includeArchived?: boolean;
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
export class BingoSetOptions {
  @StringOption({
    name: 'set',
    description: 'Choose a bingo set or enter its ID',
    required: true,
    autocomplete: true,
  })
  set: string;
}
export class BingoShowOptions extends BingoPageOptions {
  @StringOption({
    name: 'set',
    description: 'Choose a bingo set or enter its ID',
    required: true,
    autocomplete: true,
  })
  set: string;
}
export class BingoMemberOptions {
  @StringOption({
    name: 'set',
    description: 'Choose a bingo set or enter its ID',
    required: true,
    autocomplete: true,
  })
  set: string;
  @MemberOption({
    name: 'user',
    description: 'A member of this server',
    required: true,
  })
  user: GuildMember;
}
export class BingoAddPhraseOptions {
  @StringOption({
    name: 'set',
    description: 'Choose a bingo set or enter its ID',
    required: true,
    autocomplete: true,
  })
  set: string;
  @StringOption({
    name: 'text',
    description: 'Phrase to add to the pool',
    required: true,
    min_length: 1,
    max_length: 80,
  })
  text: string;
}
export class BingoPhraseOptions {
  @StringOption({
    name: 'set',
    description: 'Choose a bingo set or enter its ID',
    required: true,
    autocomplete: true,
  })
  set: string;
  @StringOption({
    name: 'phrase',
    description: 'Choose a phrase or enter its ID',
    required: true,
    autocomplete: true,
  })
  phrase: string;
}
export class BingoEditPhraseOptions {
  @StringOption({
    name: 'set',
    description: 'Choose a bingo set or enter its ID',
    required: true,
    autocomplete: true,
  })
  set: string;
  @StringOption({
    name: 'phrase',
    description: 'Choose a phrase or enter its ID',
    required: true,
    autocomplete: true,
  })
  phrase: string;
  @StringOption({
    name: 'text',
    description: 'New phrase text',
    required: true,
    min_length: 1,
    max_length: 80,
  })
  text: string;
}
export class BingoStartOptions {
  @StringOption({
    name: 'set',
    description: 'Choose a bingo set or enter its ID',
    required: true,
    autocomplete: true,
  })
  set: string;
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
