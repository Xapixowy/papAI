import { StringOption } from 'necord';

export class SteamIdOption {
  @StringOption({
    name: 'steam_id',
    description: 'Steam64 ID or vanity URL (e.g. 76561197960287930 or gaben)',
    required: true,
  })
  steamId: string;
}
