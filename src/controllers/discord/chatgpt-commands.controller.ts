import { CHATGPT_COMMANDS_CONFIG } from '@Constants/discord/chatgpt-commands.constant';
import { DiscordUserRoleGuard } from '@Guards/discord/discord-user-role.guard';
import { Injectable, UseGuards } from '@nestjs/common';
import { GatewayIntentBits } from 'discord.js';
import { createCommandGroupDecorator } from 'necord';
import { BaseCommandsController } from './base-commands.controller';

export const ChatgptCommandDecorator = createCommandGroupDecorator({
  name: CHATGPT_COMMANDS_CONFIG.name,
  description: CHATGPT_COMMANDS_CONFIG.description,
});

@Injectable()
@UseGuards(DiscordUserRoleGuard)
@ChatgptCommandDecorator()
export class ChatgptCommandsController extends BaseCommandsController {
  static get botIntents(): GatewayIntentBits[] {
    return [];
  }
}
