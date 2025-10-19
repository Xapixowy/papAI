import { Injectable, UseGuards } from '@nestjs/common';
import { EmbedBuilder, GatewayIntentBits, Message } from 'discord.js';
import { Context, createCommandGroupDecorator, On } from 'necord';
import { HUMAN_COMMANDS_CONFIG } from '../configs/human-commands.config';
import { DiscordUserRoleGuard } from '../guards/discord-user-role.guard';
import { HumanCommandsService } from '../services/human-commands.service';
import { BaseCommandsController } from './base-commands.controller';

export const HumanCommandDecorator = createCommandGroupDecorator({
  name: HUMAN_COMMANDS_CONFIG.name,
  description: HUMAN_COMMANDS_CONFIG.description,
});

@Injectable()
@UseGuards(DiscordUserRoleGuard)
@HumanCommandDecorator()
export class HumanCommandsController extends BaseCommandsController {
  constructor(private readonly humanCommandsService: HumanCommandsService) {
    super();
  }

  static get botIntents(): GatewayIntentBits[] {
    return [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ];
  }

  @On('messageCreate')
  public async onMessage(@Context() [message]: [Message]): Promise<void> {
    if (message.author.bot) return;

    const messageContentLower = message.content.toLowerCase();

    if (!messageContentLower.includes('gm')) {
      return;
    }

    const gmMessage = await this.humanCommandsService.gmMessageHandler();

    if (gmMessage instanceof EmbedBuilder) {
      await message.reply({
        embeds: [gmMessage],
      });
      return;
    }

    await message.reply({
      content: gmMessage,
    });
  }
}
