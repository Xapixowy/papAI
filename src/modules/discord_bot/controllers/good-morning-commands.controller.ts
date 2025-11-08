import { Injectable, UseGuards } from '@nestjs/common';
import { GatewayIntentBits, Message } from 'discord.js';
import { Context, createCommandGroupDecorator, On } from 'necord';
import { GOOD_MORNING_COMMANDS_CONFIG } from '../configs/good-morning-commands.config';
import { DiscordUserRoleGuard } from '../guards/discord-user-role.guard';
import { GoodMorningCommandsService } from '../services/good-morning-commands.service';
import { BaseCommandsController } from './base-commands.controller';

export const GoodMorningCommandDecorator = createCommandGroupDecorator({
  name: GOOD_MORNING_COMMANDS_CONFIG.name,
  description: GOOD_MORNING_COMMANDS_CONFIG.description,
});

@Injectable()
@UseGuards(DiscordUserRoleGuard)
@GoodMorningCommandDecorator()
export class GoodMorningCommandsController extends BaseCommandsController {
  constructor(
    private readonly goodMorningCommandsService: GoodMorningCommandsService,
  ) {
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
  public async onGoodMorningMessage(
    @Context() [message]: [Message],
  ): Promise<void> {
    if (message.author.bot) return;

    const messageContentLower = message.content.toLowerCase();

    if (!messageContentLower.includes('gm')) {
      return;
    }

    const goodMornignMessage =
      await this.goodMorningCommandsService.goodMorningMessageHandler();

    if (goodMornignMessage === null) {
      return;
    }

    await message.reply({
      content: goodMornignMessage,
    });
  }
}
