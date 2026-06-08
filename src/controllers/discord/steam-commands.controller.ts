import { STEAM_COMMANDS_CONFIG } from '@Constants/discord/steam-commands.constant';
import { createCommandGroupDecorator } from 'necord';

export const SteamCommandDecorator = createCommandGroupDecorator({
  name: STEAM_COMMANDS_CONFIG.name,
  description: STEAM_COMMANDS_CONFIG.description,
});
