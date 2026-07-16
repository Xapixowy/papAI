import { DiscordFeature } from '@Enums/discord/discord-feature.enum';
import { DiscordGuildService } from '@Services/discord-guild.service';
import { FitCoachMessageIntentHandlerService } from '@Services/discord/fit-coach/fit-coach-message-intent-handler.service';
import { HumanMessageIntentHandlerService } from '@Services/discord/human/human-message-intent-handler.service';
import { RemindersMessageIntentHandlerService } from '@Services/discord/reminders/reminders-message-intent-handler.service';
import type { MessageIntentHandler } from '@Types/discord/message-intent-handler.type';
import { Injectable, Logger } from '@nestjs/common';
import {
  Client,
  DMChannel,
  GatewayIntentBits,
  Message,
  TextChannel,
} from 'discord.js';
import { Context, On } from 'necord';
import { BaseCommandsController } from './base-commands.controller';

@Injectable()
export class MessageRouterController extends BaseCommandsController {
  private readonly logger = new Logger(this.constructor.name);
  private readonly dmHandlers: MessageIntentHandler[];
  private readonly mentionHandlers: MessageIntentHandler[];

  constructor(
    private readonly client: Client,
    private readonly discordGuildService: DiscordGuildService,
    remindersHandler: RemindersMessageIntentHandlerService,
    fitCoachHandler: FitCoachMessageIntentHandlerService,
    humanHandler: HumanMessageIntentHandlerService,
  ) {
    super();
    // Ordered — first match wins. Fallback (catch-all) handlers go last.
    this.dmHandlers = [remindersHandler, fitCoachHandler];
    this.mentionHandlers = [remindersHandler, humanHandler];
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
  async onDirectMessage(@Context() [message]: [Message]): Promise<void> {
    if (message.author.bot) return;
    if (!(message.channel instanceof DMChannel)) return;

    await this.dispatch(this.dmHandlers, message, null);
  }

  @On('messageCreate')
  async onGuildMention(@Context() [message]: [Message]): Promise<void> {
    if (message.author.bot) return;
    if (!(message.channel instanceof TextChannel)) return;
    if (!message.mentions.users.has(this.client.user!.id)) return;

    const guildId = message.guild?.id;
    if (!guildId) return;

    // HUMAN is the master switch for AI-driven @mention interactions on a
    // server — every other mention-based feature (reminders, ...) requires
    // it to be enabled first, on top of its own feature flag.
    const humanEnabled = await this.discordGuildService.isFeatureEnabled({
      guildId,
      feature: DiscordFeature.HUMAN,
    });
    if (humanEnabled.isErr() || !humanEnabled.value) return;

    await this.dispatch(this.mentionHandlers, message, guildId);
  }

  private async dispatch(
    handlers: MessageIntentHandler[],
    message: Message,
    guildId: string | null,
  ): Promise<void> {
    for (const handler of handlers) {
      if (!handler.matches(message.content)) continue;

      if (guildId && handler.requiredGuildFeature) {
        const enabled = await this.discordGuildService.isFeatureEnabled({
          guildId,
          feature: handler.requiredGuildFeature,
        });
        if (enabled.isErr() || !enabled.value) continue;
      }

      try {
        await handler.handle(message);
      } catch (error) {
        this.logger.error(`Handler "${handler.name}" failed: ${error}`);
      }
      return;
    }
  }
}
