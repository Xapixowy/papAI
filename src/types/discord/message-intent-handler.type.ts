import { DiscordFeature } from '@Enums/discord/discord-feature.enum';
import { Message } from 'discord.js';

export interface MessageIntentHandler {
  readonly name: string;
  readonly requiredGuildFeature?: DiscordFeature;
  matches(content: string): boolean;
  handle(message: Message): Promise<void>;
}
