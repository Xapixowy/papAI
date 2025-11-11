import { DiscordChannelFeature } from '@Enums/discord/discord-channel-feature.enum';
import { DiscordSettingKey } from '@Enums/discord/discord-setting-key.enum';

export const CHANNEL_FEATURE_DEFAULTS: Record<DiscordChannelFeature, boolean> =
  {
    [DiscordChannelFeature.HUMAN_SAVE_MESSAGES]: false,
    [DiscordChannelFeature.HUMAN_RANDOM_REPLY]: true,
    [DiscordChannelFeature.GOOD_MORNING_MESSAGES]: false,
  };

type GLOBAL_SETTINGS =
  | DiscordSettingKey.CHATGPT_PRICE
  | DiscordSettingKey.CHATGPT_CURRENCY
  | DiscordSettingKey.CHATGPT_REMINDER_DATE
  | DiscordSettingKey.CHATGPT_REMINDER_CHANNELS
  | DiscordSettingKey.CHATGPT_PAYMENT_DATE;

export const GUILD_SETTING_DEFAULTS: Record<
  Exclude<DiscordSettingKey, GLOBAL_SETTINGS>,
  any
> = {
  [DiscordSettingKey.GOOD_MORNING_QUERY]: 'Good morning',
  [DiscordSettingKey.HUMAN_SYSTEM_PROMPT]:
    'You are a helpful assistant that answers questions. Your responses are short and concise.',
};
