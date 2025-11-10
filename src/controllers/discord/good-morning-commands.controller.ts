import { GOOD_MORNING_COMMANDS_CONFIG } from '@Constants/discord/good-morning-commands.constant';
import { DiscordUserRoleGuard } from '@Guards/discord/discord-user-role.guard';
import { Injectable, UseGuards } from '@nestjs/common';
import { GoodMorningCommandsService } from '@Services/discord/good-morning-commands.service';
import { GatewayIntentBits, Message } from 'discord.js';
import { Context, createCommandGroupDecorator, On } from 'necord';
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

    const guildId = message.guild?.id;

    if (!guildId) {
      return;
    }

    const messageContentLower = message.content.toLowerCase();

    if (!messageContentLower.includes('gm')) {
      return;
    }

    const goodMornignMessage =
      await this.goodMorningCommandsService.goodMorningMessageHandler(guildId);

    if (goodMornignMessage === null) {
      return;
    }

    await message.reply({
      content: goodMornignMessage,
    });
  }
}
