import { DiscordFeature } from '@Enums/discord/discord-feature.enum';
import { SetMetadata } from '@nestjs/common';

export const REQUIRES_DISCORD_GUILD_FEATURE = 'requiresDiscordGuildFeature';

export const RequiresDiscordGuildFeature = (feature: DiscordFeature) =>
  SetMetadata(REQUIRES_DISCORD_GUILD_FEATURE, feature);
