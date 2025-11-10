import { DiscordFeature } from '@Enums/discord/discord-feature.enum';
import { StringOption } from 'necord';

export class FeatureOption {
  @StringOption({
    name: 'feature',
    description: 'Feature',
    required: true,
    choices: Object.entries(DiscordFeature).map(([key, value]) => ({
      name: key,
      value,
    })),
  })
  feature: DiscordFeature;
}
