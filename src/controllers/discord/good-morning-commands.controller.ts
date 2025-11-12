import { GOOD_MORNING_COMMANDS_CONFIG } from '@Constants/discord/good-morning-commands.constant';
import { RequiresDiscordGuildFeature } from '@Decorators/requires-discord-guild-feature.decorator';
import { DiscordFeature } from '@Enums/discord/discord-feature.enum';
import { DiscordGuildFeatureGuard } from '@Guards/discord/discord-guild-feature.guard';
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
@UseGuards(DiscordGuildFeatureGuard, DiscordUserRoleGuard)
@RequiresDiscordGuildFeature(DiscordFeature.GOOD_MORNING)
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

    const channelId = message.channel.id;

    const messageContentLower = message.content.toLowerCase();

    if (!messageContentLower.includes('gm')) {
      return;
    }

    const goodMorningMessage =
      await this.goodMorningCommandsService.goodMorningMessageHandler({
        guildId,
        channelId,
      });

    if (goodMorningMessage === null) {
      return;
    }

    await message.reply({
      content: goodMorningMessage,
    });
  }
}
