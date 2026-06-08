import { BooleanOption } from 'necord';

export class SteamObserverUpdateOption {
  @BooleanOption({
    name: 'enrich',
    description: 'Also enrich all game details (descriptions, platforms, screenshots, etc.)',
    required: false,
  })
  enrich: boolean | null;
}
