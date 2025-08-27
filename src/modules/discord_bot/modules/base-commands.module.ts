import { GatewayIntentBits } from 'discord.js';

export abstract class BaseCommandsModule {
  static get botIntents(): GatewayIntentBits[] {
    throw new Error('Must be implemented in subclass');
  }
}
