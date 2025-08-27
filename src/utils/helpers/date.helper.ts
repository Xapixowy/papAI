import { DateFormat } from '@Enums/date-format.enum';
import {
  formatDistanceToNow,
  formatDistanceToNowStrict,
  setDate,
  setHours,
  setMinutes,
  setMonth,
  setSeconds,
  setWeek,
  setYear,
  subDays,
  subMonths,
} from 'date-fns';
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

  static formatDistance(date: Date, strict: boolean = false): string {
    return strict
      ? formatDistanceToNowStrict(date)
      : formatDistanceToNow(date, { addSuffix: true });
  }

  static set(
    date: Date,
    {
      second,
      minute,
      hour,
      day,
      week,
      month,
      year,
    }: Record<string, number | undefined>,
  ): Date {
    let newDate: Date = date;

    if (second) {
      newDate = setSeconds(newDate, second);
    }

    if (minute) {
      newDate = setMinutes(newDate, minute);
    }

    if (hour) {
      newDate = setHours(newDate, hour);
    }

    if (day) {
      newDate = setDate(newDate, day);
    }

    if (week) {
      newDate = setWeek(newDate, week);
    }

    if (month) {
      newDate = setMonth(newDate, month);
    }

    if (year) {
      newDate = setYear(newDate, year);
    }

    return newDate;
  }

  static add(
    date: Date,
    {
      seconds,
      minutes,
      hours,
      days,
      weeks,
      months,
      years,
    }: Record<string, number | undefined>,
  ): Date {
    return DateHelper.subtract(date, {
      seconds: seconds ? -seconds : undefined,
      minutes: minutes ? -minutes : undefined,
      hours: hours ? -hours : undefined,
      days: days ? -days : undefined,
      weeks: weeks ? -weeks : undefined,
      months: months ? -months : undefined,
      years: years ? -years : undefined,
    });
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
    }: Record<string, number | undefined>,
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
