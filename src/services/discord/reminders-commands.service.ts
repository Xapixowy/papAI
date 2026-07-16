import {
  CANCEL_REMINDER_TOOL_NAME,
  CREATE_REMINDER_TOOL_NAME,
  REMINDERS_GEMINI_TOOLS,
} from '@Constants/discord/reminders-gemini-tools.constant';
import { REMINDERS_SYSTEM_PROMPT } from '@Constants/discord/reminders-system-prompt.constant';
import { ERROR_CODE_MESSAGE_MAP } from '@Constants/error-messages.constant';
import { EnvKey } from '@Enums/env-key.enum';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GeminiService } from '@Services/api/gemini.service';
import { EmbedBuilderService } from '@Services/discord/embed-builder.service';
import {
  CancelReminderArgs,
  CancelReminderResult,
  CreateReminderArgs,
  CreateReminderResult,
  RemindersGeminiToolsService,
} from '@Services/discord/reminders/gemini-tools.service';
import { RemindersService } from '@Services/reminders.service';
import { EmbedBuilder } from 'discord.js';

@Injectable()
export class RemindersCommandsService {
  private readonly logger = new Logger(this.constructor.name);

  constructor(
    private readonly geminiService: GeminiService,
    private readonly remindersService: RemindersService,
    private readonly remindersGeminiToolsService: RemindersGeminiToolsService,
    private readonly embedBuilderService: EmbedBuilderService,
    private readonly configService: ConfigService,
  ) {}

  async createFromSlashCommand({
    content,
    time,
    date,
    discordUserId,
    discordGuildId,
    sourceChannelId,
  }: {
    content: string;
    time: string;
    date?: string;
    discordUserId: string;
    discordGuildId: string | null;
    sourceChannelId: string;
  }): Promise<EmbedBuilder[]> {
    const timezone = this.getTimezone();
    const now = new Date();

    const result = await this.remindersGeminiToolsService.handleCreateReminder(
      { content, date, time },
      { discordUserId, discordGuildId, sourceChannelId, timezone, now },
    );

    return this.buildCreateResultEmbed(result);
  }

  async handleNaturalLanguageMessage({
    text,
    discordUserId,
    discordGuildId,
    sourceChannelId,
  }: {
    text: string;
    discordUserId: string;
    discordGuildId: string | null;
    sourceChannelId: string;
  }): Promise<EmbedBuilder[]> {
    return this.runGeminiToolFlow(text, {
      discordUserId,
      discordGuildId,
      sourceChannelId,
    });
  }

  async list({
    discordUserId,
  }: {
    discordUserId: string;
  }): Promise<EmbedBuilder[]> {
    const timezone = this.getTimezone();
    const reminders =
      await this.remindersService.findActivePendingByUser(discordUserId);

    if (reminders.length === 0) {
      return this.embedBuilderService.simple({
        description: 'You have no pending reminders.',
        variant: 'info',
      });
    }

    const lines = reminders.map(
      (reminder) =>
        `\`${reminder.id.slice(0, 8)}\` — ${reminder.content} — ${this.remindersGeminiToolsService.formatLocal(reminder.remindAt, timezone)}`,
    );

    return this.embedBuilderService.simple({
      title: 'Pending reminders',
      description: lines.join('\n'),
      variant: 'info',
    });
  }

  async cancel({
    discordUserId,
    idPrefix,
  }: {
    discordUserId: string;
    idPrefix: string;
  }): Promise<EmbedBuilder[]> {
    const reminders =
      await this.remindersService.findActivePendingByUser(discordUserId);
    const match = reminders.find((reminder) =>
      reminder.id.startsWith(idPrefix),
    );

    if (!match) {
      return this.buildErrorEmbed(
        `No pending reminder found with id \`${idPrefix}\`.`,
      );
    }

    const cancelled = await this.remindersService.cancel(
      match.id,
      discordUserId,
    );

    if (cancelled.isErr()) {
      return this.buildErrorEmbed('Could not cancel that reminder.');
    }

    return this.buildCancelledEmbed(cancelled.value.content);
  }

  private async runGeminiToolFlow(
    promptText: string,
    ctx: {
      discordUserId: string;
      discordGuildId: string | null;
      sourceChannelId: string;
    },
  ): Promise<EmbedBuilder[]> {
    const timezone = this.getTimezone();
    const now = new Date();
    const systemPrompt = this.buildSystemPrompt(timezone, now);
    const queryParts = [{ text: promptText }];

    const firstResult = await this.geminiService.generateContentWithTools({
      systemPrompt,
      queryParts,
      tools: REMINDERS_GEMINI_TOOLS,
    });

    if (firstResult.isErr()) {
      this.logger.error('There was an error generating the reminder response.');
      return this.buildErrorEmbed('Something went wrong. Please try again.');
    }

    const firstResultValue = firstResult.value;

    if ('text' in firstResultValue) {
      // Clarifying question / off-topic reply — not a definitive success or
      // error outcome, so Gemini's own phrasing (in the user's language) is
      // used as-is here, unlike the standardized templates below.
      return this.embedBuilderService.simple({
        description: firstResultValue.text,
        variant: 'info',
      });
    }

    const [functionCall] = firstResultValue.functionCalls;

    if (functionCall.name === CREATE_REMINDER_TOOL_NAME) {
      const result =
        await this.remindersGeminiToolsService.handleCreateReminder(
          functionCall.args as CreateReminderArgs,
          { ...ctx, timezone, now },
        );
      return this.buildCreateResultEmbed(result);
    }

    if (functionCall.name === CANCEL_REMINDER_TOOL_NAME) {
      const result =
        await this.remindersGeminiToolsService.handleCancelReminder(
          functionCall.args as CancelReminderArgs,
          { discordUserId: ctx.discordUserId, timezone },
        );
      return this.buildCancelResultEmbed(result);
    }

    return this.buildErrorEmbed('Something went wrong. Please try again.');
  }

  private buildCreateResultEmbed(result: CreateReminderResult): EmbedBuilder[] {
    if (!result.success) {
      return this.buildErrorEmbed(ERROR_CODE_MESSAGE_MAP[result.error]);
    }

    return this.embedBuilderService.simple({
      title: 'Reminder set',
      description: `Reminder set for ${result.remind_at_local} — content: "${result.content}"`,
      variant: 'success',
    });
  }

  private buildCancelResultEmbed(result: CancelReminderResult): EmbedBuilder[] {
    if (result.success) {
      return this.buildCancelledEmbed(result.content);
    }

    if (result.reason === 'multiple_matches') {
      const candidates = result.candidates
        .map((c) => `"${c.content}" (${c.remind_at_local})`)
        .join(', ');
      return this.buildErrorEmbed(
        `Found multiple matching reminders — please be more specific: ${candidates}`,
      );
    }

    if (result.reason === 'no_matches') {
      return this.buildErrorEmbed('No matching pending reminder found.');
    }

    return this.buildErrorEmbed('Could not cancel that reminder.');
  }

  private buildCancelledEmbed(content: string): EmbedBuilder[] {
    return this.embedBuilderService.simple({
      title: 'Reminder cancelled',
      description: `Cancelled reminder: "${content}"`,
      variant: 'success',
    });
  }

  private buildErrorEmbed(message: string): EmbedBuilder[] {
    return this.embedBuilderService.simple({
      description: message,
      variant: 'error',
    });
  }

  private buildSystemPrompt(timezone: string, now: Date): string {
    return `${REMINDERS_SYSTEM_PROMPT}\nCurrent UTC time: ${now.toISOString()}\nCurrent local time: ${now.toLocaleString('en-GB', { timeZone: timezone })}`;
  }

  private getTimezone(): string {
    return this.configService.get<string>(EnvKey.APP_TIMEZONE) ?? 'UTC';
  }
}
