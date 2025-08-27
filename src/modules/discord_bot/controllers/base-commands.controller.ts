import { GatewayIntentBits } from 'discord.js';

export abstract class BaseCommandsController {
  static get botIntents(): GatewayIntentBits[] {
    throw new Error('Must be implemented in subclass');
  }
}
