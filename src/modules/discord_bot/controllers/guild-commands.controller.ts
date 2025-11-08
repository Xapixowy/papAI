import { Injectable, UseGuards } from '@nestjs/common';
import { GatewayIntentBits } from 'discord.js';
import { createCommandGroupDecorator } from 'necord';
import { GUILD_COMMANDS_CONFIG } from '../configs/guild-comannds.config';
import { DiscordUserRoleGuard } from '../guards/discord-user-role.guard';
import { BaseCommandsController } from './base-commands.controller';

export const GuildCommandDecorator = createCommandGroupDecorator({
  name: GUILD_COMMANDS_CONFIG.name,
  description: GUILD_COMMANDS_CONFIG.description,
});

@Injectable()
@UseGuards(DiscordUserRoleGuard)
@GuildCommandDecorator()
export class GuildCommandsController extends BaseCommandsController {
  static get botIntents(): GatewayIntentBits[] {
    return [];
  }
}
