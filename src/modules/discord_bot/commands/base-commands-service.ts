import { GatewayIntentBits } from 'discord.js';

export abstract class BaseCommandsService {
  static get botIntents(): GatewayIntentBits[] {
    throw new Error('Must be implemented in subclass');
  }

  static get embedTitle(): string {
    throw new Error('Must be implemented in subclass');
  }
}
