import { FitCoachUserSettings } from '@Entities/fit-coach-user-settings.entity';
import { MealType } from '@Enums/fit-coach/meal-type.enum';
import { Injectable } from '@nestjs/common';
import { DiscordMessageService } from '@Services/discord-message.service';
import { FitCoachMealsService } from '@Services/fit-coach-meals.service';
import type { PendingMeal } from '@Types/fit-coach/pending-meal.type';
import type {
  GetPeriodSummaryArgs,
  LookupNutritionArgs,
  LookupNutritionBatchArgs,
  ProposeMealArgs,
  SearchUserMessagesArgs,
} from '@Types/fit-coach/gemini-tools.type';

export type {
  GetPeriodSummaryArgs,
  LookupNutritionArgs,
  LookupNutritionBatchArgs,
  ProposeMealArgs,
  SearchUserMessagesArgs,
};

@Injectable()
export class FitCoachGeminiToolsService {
  constructor(
    private readonly fitCoachMealsService: FitCoachMealsService,
    private readonly discordMessageService: DiscordMessageService,
  ) {}

  buildPendingMeal(
    args: ProposeMealArgs,
    settings: FitCoachUserSettings,
    now: Date,
  ): PendingMeal {
    const mealType =
      (args.meal_type as MealType) || this.inferMealType(now, settings);

    const mealAt: Date =
      args.date && args.time
        ? this.localDateTimeToUTC(args.date, args.time, settings.timezone)
        : args.date
          ? this.localDateTimeToUTC(
              args.date,
              settings.mealTimeRanges[mealType].start,
              settings.timezone,
            )
          : now;

    const mealAtLocal = new Intl.DateTimeFormat('en-GB', {
      timeZone: settings.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(mealAt);

    return {
      name: args.name,
      calories: args.calories,
      protein: args.protein,
      fat: args.fat,
      carbs: args.carbs,
      mealType,
      mealAt: mealAt.toISOString(),
      mealAtLocal,
    };
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

  async handlePeriodSummary(
    discordUserId: string,
    settings: FitCoachUserSettings,
    args: { period: 'day' | 'week' | 'month' | 'year'; date?: string },
  ): Promise<{
    period: string;
    label: string;
    data: {
      totalCalories: number;
      totalProtein: number;
      totalFat: number;
      totalCarbs: number;
      totalGrams: number;
      mealCount: number;
    };
  }> {
    const refDate = args.date ? new Date(`${args.date}T12:00:00Z`) : new Date();

    const { from, to, label } = this.getPeriodBounds(
      refDate,
      args.period,
      settings.timezone,
    );

    const data = await this.fitCoachMealsService.getSummaryForPeriod(
      discordUserId,
      from,
      to,
    );

    return { period: args.period, label, data };
  }

  async handleSearchUserMessages(
    discordUserId: string,
    args: SearchUserMessagesArgs,
  ): Promise<object> {
    const results = await this.discordMessageService.searchByUser({
      discordUserId,
      keyword: args.keyword,
      dateFrom: args.date_from ? new Date(args.date_from) : undefined,
      dateTo: args.date_to ? new Date(args.date_to) : undefined,
      hasAttachments: args.has_attachments,
      limit: Math.min(args.limit ?? 20, 50),
    });

    const formatted = results.map((r) => ({
      message: r.message,
      guild_id: r.discordGuildId,
      channel_id: r.discordChannelId,
      date: r.createdAt.toISOString(),
      has_attachments: (r.attachments?.length ?? 0) > 0,
      attachment_urls: r.attachments ?? [],
    }));

    return { results: formatted, total: formatted.length };
  }

  inferMealType(now: Date, settings: FitCoachUserSettings): MealType {
    const localTimeStr = now.toLocaleTimeString('en-GB', {
      timeZone: settings.timezone,
      hour: '2-digit',
      minute: '2-digit',
    });

    const [hours, minutes] = localTimeStr.split(':').map(Number);
    const currentMinutes = hours * 60 + minutes;

    for (const mealType of Object.values(MealType)) {
      const range = settings.mealTimeRanges[mealType];
      const [startH, startM] = range.start.split(':').map(Number);
      const [endH, endM] = range.end.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      if (startMinutes <= endMinutes) {
        if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
          return mealType;
        }
      } else {
        if (currentMinutes >= startMinutes || currentMinutes < endMinutes) {
          return mealType;
        }
      }
    }

    return MealType.SNACK;
  }

  toLocalDateString(date: Date, timezone: string): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  }

  private getPeriodBounds(
    refDate: Date,
    period: 'day' | 'week' | 'month' | 'year',
    timezone: string,
  ): { from: Date; to: Date; label: string } {
    const localStr = this.toLocalDateString(refDate, timezone);
    const [year, month, day] = localStr.split('-').map(Number);

    let from: Date;
    let to: Date;
    let label: string;

    if (period === 'day') {
      from = new Date(`${localStr}T00:00:00`);
      to = new Date(`${localStr}T23:59:59.999`);
      label = localStr;
    } else if (period === 'week') {
      const d = new Date(year, month - 1, day);
      const dayOfWeek = d.getDay();
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((dayOfWeek + 6) % 7));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      from = new Date(`${this.formatDate(monday)}T00:00:00`);
      to = new Date(`${this.formatDate(sunday)}T23:59:59.999`);
      label = `${this.formatDate(monday)} - ${this.formatDate(sunday)}`;
    } else if (period === 'month') {
      from = new Date(`${year}-${String(month).padStart(2, '0')}-01T00:00:00`);
      const lastDay = new Date(year, month, 0).getDate();
      to = new Date(
        `${year}-${String(month).padStart(2, '0')}-${lastDay}T23:59:59.999`,
      );
      label = `${year}-${String(month).padStart(2, '0')}`;
    } else {
      from = new Date(`${year}-01-01T00:00:00`);
      to = new Date(`${year}-12-31T23:59:59.999`);
      label = String(year);
    }

    return { from, to, label };
  }

  private formatDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
}
