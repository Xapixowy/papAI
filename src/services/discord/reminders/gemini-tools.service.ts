import { ErrorCode } from '@Enums/error-code.enum';
import { Injectable } from '@nestjs/common';
import { RemindersService } from '@Services/reminders.service';
import type {
  CancelReminderArgs,
  CreateReminderArgs,
} from '@Types/discord/reminders/gemini-tools.type';
import { err, ok, Result } from 'neverthrow';

export type { CancelReminderArgs, CreateReminderArgs };

export type CreateReminderResult =
  | { success: true; id: string; content: string; remind_at_local: string }
  | { success: false; error: ErrorCode };

@Injectable()
export class RemindersGeminiToolsService {
  constructor(private readonly remindersService: RemindersService) {}

  async handleCreateReminder(
    args: CreateReminderArgs,
    ctx: {
      discordUserId: string;
      discordGuildId: string | null;
      sourceChannelId: string;
      timezone: string;
      now: Date;
    },
  ): Promise<CreateReminderResult> {
    const resolved = this.resolveDateTime({
      dateStr: args.date,
      timeStr: args.time,
      timezone: ctx.timezone,
      now: ctx.now,
    });

    if (resolved.isErr()) {
      return { success: false, error: resolved.error };
    }

    const remindAt = resolved.value;
    const reminder = await this.remindersService.create({
      discordUserId: ctx.discordUserId,
      discordGuildId: ctx.discordGuildId,
      sourceChannelId: ctx.sourceChannelId,
      content: args.content,
      remindAt,
    });

    return {
      success: true,
      id: reminder.id.slice(0, 8),
      content: reminder.content,
      remind_at_local: this.formatLocal(remindAt, ctx.timezone),
    };
  }

  async handleCancelReminder(
    args: CancelReminderArgs,
    ctx: { discordUserId: string; timezone: string },
  ): Promise<object> {
    const matches = await this.remindersService.findPendingByUserAndContentHint(
      ctx.discordUserId,
      args.content_hint,
    );

    if (matches.length === 0) {
      return { success: false, reason: 'no_matches' };
    }

    if (matches.length > 1) {
      return {
        success: false,
        reason: 'multiple_matches',
        candidates: matches.map((match) => ({
          content: match.content,
          remind_at_local: this.formatLocal(match.remindAt, ctx.timezone),
        })),
      };
    }

    const cancelled = await this.remindersService.cancel(
      matches[0].id,
      ctx.discordUserId,
    );

    if (cancelled.isErr()) {
      return { success: false, reason: 'not_found' };
    }

    return { success: true, content: cancelled.value.content };
  }

  resolveDateTime({
    dateStr,
    timeStr,
    timezone,
    now,
  }: {
    dateStr?: string;
    timeStr: string;
    timezone: string;
    now: Date;
  }): Result<Date, ErrorCode> {
    if (!/^\d{1,2}:\d{2}$/.test(timeStr)) {
      return err(ErrorCode.REMINDER_INVALID_DATETIME);
    }

    if (dateStr) {
      const remindAt = this.localDateTimeToUTC(dateStr, timeStr, timezone);

      if (Number.isNaN(remindAt.getTime())) {
        return err(ErrorCode.REMINDER_INVALID_DATETIME);
      }

      if (remindAt.getTime() < now.getTime()) {
        return err(ErrorCode.REMINDER_PAST_DATETIME);
      }

      return ok(remindAt);
    }

    // No date given — fire at the next upcoming occurrence of `timeStr`
    // (today if it hasn't passed yet, otherwise tomorrow).
    const todayStr = this.toLocalDateString(now, timezone);
    const todayAttempt = this.localDateTimeToUTC(todayStr, timeStr, timezone);

    if (todayAttempt.getTime() > now.getTime()) {
      return ok(todayAttempt);
    }

    return ok(new Date(todayAttempt.getTime() + 24 * 60 * 60 * 1000));
  }

  formatLocal(date: Date, timezone: string): string {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  }

  private toLocalDateString(date: Date, timezone: string): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  }

  private localDateTimeToUTC(
    dateStr: string,
    timeStr: string,
    timezone: string,
  ): Date {
    const [h, m] = timeStr.split(':').map(Number);
    const probe = new Date(`${dateStr}T${timeStr}:00Z`);
    const localParts = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(probe);
    const probeH = parseInt(
      localParts.find((p) => p.type === 'hour')?.value ?? '0',
    );
    const probeM = parseInt(
      localParts.find((p) => p.type === 'minute')?.value ?? '0',
    );
    const diffMs = ((h - probeH) * 60 + (m - probeM)) * 60 * 1000;
    return new Date(probe.getTime() + diffMs);
  }
}
