import { DiscordChannelFeature } from '@Enums/discord/discord-channel-feature.enum';
import { BooleanOption, StringOption } from 'necord';

export class ChannelFeatureValueOption {
  @StringOption({
    name: 'feature',
    description: 'Feature',
    required: true,
    choices: Object.entries(DiscordChannelFeature).map(([key, value]) => ({
      name: key,
      value,
    })),
  })
  feature: DiscordChannelFeature;

  @BooleanOption({
    name: 'value',
    description: 'Value',
    required: true,
  })
  value: boolean;
}
