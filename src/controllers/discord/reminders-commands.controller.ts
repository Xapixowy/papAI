import {
  REMINDER_COMMANDS_CONFIG,
  REMINDER_KEYWORDS,
} from '@Constants/discord/reminders-commands.constant';
import { RequiresDiscordGuildFeature } from '@Decorators/nest/requires-discord-guild-feature.decorator';
import { DiscordFeature } from '@Enums/discord/discord-feature.enum';
import { DiscordGuildFeatureGuard } from '@Guards/discord/discord-guild-feature.guard';
import { DiscordUserRoleGuard } from '@Guards/discord/discord-user-role.guard';
import { Injectable, UseGuards } from '@nestjs/common';
import { RemindersCommandsService } from '@Services/discord/reminders-commands.service';
import {
  Client,
  DMChannel,
  GatewayIntentBits,
  InteractionContextType,
  Message,
  TextChannel,
} from 'discord.js';
import { Context, createCommandGroupDecorator, On } from 'necord';
import { BaseCommandsController } from './base-commands.controller';

export const ReminderCommandDecorator = createCommandGroupDecorator({
  name: REMINDER_COMMANDS_CONFIG.name,
  description: REMINDER_COMMANDS_CONFIG.description,
  contexts: [InteractionContextType.Guild, InteractionContextType.BotDM],
});

@Injectable()
@UseGuards(DiscordGuildFeatureGuard, DiscordUserRoleGuard)
@RequiresDiscordGuildFeature(DiscordFeature.REMINDERS)
export class RemindersMessageCommandsController extends BaseCommandsController {
  constructor(
    private readonly remindersCommandsService: RemindersCommandsService,
    private readonly client: Client,
  ) {
    super();
  }

  static get botIntents(): GatewayIntentBits[] {
    return [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.MessageContent,
    ];
  }

  @On('messageCreate')
  async onMentionMessage(@Context() [message]: [Message]): Promise<void> {
    const isBotMessage = message.author.bot;
    const isBotMention = message.mentions.users.has(this.client.user!.id);
    const isMessageTextChannel = message.channel instanceof TextChannel;

    if (isBotMessage || !isBotMention || !isMessageTextChannel) return;

    const guildId = message.guild?.id;

    if (!guildId) {
      return;
    }

    if (!this.containsReminderKeyword(message.content)) return;

    const embeds =
      await this.remindersCommandsService.handleNaturalLanguageMessage({
        text: message.content,
        discordUserId: message.author.id,
        discordGuildId: guildId,
        sourceChannelId: message.channel.id,
      });

    await message.reply({ embeds });
  }

  @On('messageCreate')
  async onDmMessage(@Context() [message]: [Message]): Promise<void> {
    if (message.author.bot) return;
    if (!(message.channel instanceof DMChannel)) return;
    if (!this.containsReminderKeyword(message.content)) return;

    const embeds =
      await this.remindersCommandsService.handleNaturalLanguageMessage({
        text: message.content,
        discordUserId: message.author.id,
        discordGuildId: null,
        sourceChannelId: message.channel.id,
      });

    await message.reply({ embeds });
  }

  private containsReminderKeyword(content: string): boolean {
    const lower = content.toLowerCase();
    return REMINDER_KEYWORDS.some((keyword) => lower.includes(keyword));
  }
}
