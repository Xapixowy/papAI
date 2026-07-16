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
  CreateReminderArgs,
  RemindersGeminiToolsService,
} from '@Services/discord/reminders/gemini-tools.service';
import { RemindersService } from '@Services/reminders.service';
import { EmbedVariant } from '@Types/discord/embed-variant.type';
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

    if (!result.success) {
      return this.embedBuilderService.simple({
        description: ERROR_CODE_MESSAGE_MAP[result.error],
        variant: 'error',
      });
    }

    return this.embedBuilderService.simple({
      title: 'Reminder set',
      description: `I will remind you about "${result.content}" on ${result.remind_at_local}.`,
      variant: 'success',
    });
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
    const result = await this.runGeminiToolFlow(text, {
      discordUserId,
      discordGuildId,
      sourceChannelId,
    });

    return this.embedBuilderService.simple({
      description: result.text,
      variant: result.variant,
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
      return this.embedBuilderService.simple({
        description: `No pending reminder found with id \`${idPrefix}\`.`,
        variant: 'error',
      });
    }

    const cancelled = await this.remindersService.cancel(
      match.id,
      discordUserId,
    );

    if (cancelled.isErr()) {
      return this.embedBuilderService.simple({
        description: 'Could not cancel that reminder.',
        variant: 'error',
      });
    }

    return this.embedBuilderService.simple({
      description: `Cancelled reminder: ${cancelled.value.content}`,
      variant: 'success',
    });
  }

  private async runGeminiToolFlow(
    promptText: string,
    ctx: {
      discordUserId: string;
      discordGuildId: string | null;
      sourceChannelId: string;
    },
  ): Promise<{ text: string; variant: EmbedVariant }> {
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
      return {
        text: 'Something went wrong. Please try again.',
        variant: 'error',
      };
    }

    const firstResultValue = firstResult.value;

    if ('text' in firstResultValue) {
      return { text: firstResultValue.text, variant: 'info' };
    }

    const [functionCall] = firstResultValue.functionCalls;
    let toolResult: object;

    if (functionCall.name === CREATE_REMINDER_TOOL_NAME) {
      toolResult = await this.remindersGeminiToolsService.handleCreateReminder(
        functionCall.args as CreateReminderArgs,
        { ...ctx, timezone, now },
      );
    } else if (functionCall.name === CANCEL_REMINDER_TOOL_NAME) {
      toolResult = await this.remindersGeminiToolsService.handleCancelReminder(
        functionCall.args as CancelReminderArgs,
        { discordUserId: ctx.discordUserId, timezone },
      );
    } else {
      return {
        text: 'Something went wrong. Please try again.',
        variant: 'error',
      };
    }

    const finalResult =
      await this.geminiService.generateContentWithFunctionResponse({
        systemPrompt,
        queryParts,
        modelContent: firstResultValue.modelContent,
        functionCallName: functionCall.name,
        functionResponse: toolResult,
      });

    if (finalResult.isErr()) {
      this.logger.error(
        'There was an error generating the reminder confirmation.',
      );
      return {
        text: 'Something went wrong. Please try again.',
        variant: 'error',
      };
    }

    const success =
      'success' in toolResult
        ? Boolean((toolResult as { success?: boolean }).success)
        : true;

    return { text: finalResult.value, variant: success ? 'success' : 'error' };
  }

  private buildSystemPrompt(timezone: string, now: Date): string {
    return `${REMINDERS_SYSTEM_PROMPT}\nCurrent UTC time: ${now.toISOString()}\nCurrent local time: ${now.toLocaleString('en-GB', { timeZone: timezone })}`;
  }

  private getTimezone(): string {
    return this.configService.get<string>(EnvKey.APP_TIMEZONE) ?? 'UTC';
  }
}
