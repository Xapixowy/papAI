import appConfig from './app.config';
import discordConfig from './discord.config';
import geminiConfig from './gemini.config';

export * from '../env-validation';

export const configs = [appConfig, discordConfig, geminiConfig];
