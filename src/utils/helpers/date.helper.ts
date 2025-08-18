import { DateFormat } from '@Enums/date-format.enum';
import { subDays, subMonths } from 'date-fns';
import { formatDate as fnsFormatDate } from 'date-fns/format';
import { subHours } from 'date-fns/subHours';
import { subMinutes } from 'date-fns/subMinutes';
import { subSeconds } from 'date-fns/subSeconds';
import { subWeeks } from 'date-fns/subWeeks';
import { subYears } from 'date-fns/subYears';

export class DateHelper {
  static formatDate(date: Date, format: DateFormat): string {
    return fnsFormatDate(date, format);
  }

  static subtract(
    date: Date,
    {
      seconds,
      minutes,
      hours,
      days,
      weeks,
      months,
      years,
    }: {
      seconds?: number;
      minutes?: number;
      hours?: number;
      days?: number;
      weeks?: number;
      months?: number;
      years?: number;
    },
  ): Date {
    let newDate: Date = date;

    if (seconds) {
      newDate = subSeconds(newDate, seconds);
    }

    if (minutes) {
      newDate = subMinutes(newDate, minutes);
    }

    if (hours) {
      newDate = subHours(newDate, hours);
    }

    if (days) {
      newDate = subDays(newDate, days);
    }

    if (weeks) {
      newDate = subWeeks(newDate, weeks);
    }

    if (months) {
      newDate = subMonths(newDate, months);
    }

    if (years) {
      newDate = subYears(newDate, years);
    }

    return newDate;
  }
}
