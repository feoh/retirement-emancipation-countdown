export interface Breakdown {
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export const DAYS_PER_YEAR = 365.2425;

const MS_PER_DAY = 86_400_000;

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function addMonthsLocal(date: Date, months: number): Date {
  const absoluteMonth = date.getMonth() + months;
  const year = date.getFullYear() + Math.floor(absoluteMonth / 12);
  const month = ((absoluteMonth % 12) + 12) % 12;
  const day = Math.min(date.getDate(), daysInMonth(year, month));
  return new Date(
    year,
    month,
    day,
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds(),
  );
}

export function addDaysLocal(date: Date, days: number): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + days,
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds(),
  );
}

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function calendarDaysBetween(from: Date, to: Date): number {
  const a = startOfLocalDay(from).getTime();
  const b = startOfLocalDay(to).getTime();
  return Math.round((b - a) / MS_PER_DAY);
}

export function retirementMoment(firstRetiredDay: Date): Date {
  return startOfLocalDay(firstRetiredDay);
}

const ZERO: Breakdown = {
  years: 0,
  months: 0,
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0,
};

export function decompose(from: Date, to: Date): Breakdown {
  if (to.getTime() <= from.getTime()) return { ...ZERO };

  let months =
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth());
  while (months > 0 && addMonthsLocal(from, months).getTime() > to.getTime()) {
    months--;
  }
  while (addMonthsLocal(from, months + 1).getTime() <= to.getTime()) {
    months++;
  }

  const afterMonths = addMonthsLocal(from, months);

  let days = Math.floor((to.getTime() - afterMonths.getTime()) / MS_PER_DAY);
  while (days > 0 && addDaysLocal(afterMonths, days).getTime() > to.getTime()) {
    days--;
  }
  while (addDaysLocal(afterMonths, days + 1).getTime() <= to.getTime()) {
    days++;
  }

  const cursor = addDaysLocal(afterMonths, days);
  let remainder = Math.floor((to.getTime() - cursor.getTime()) / 1000);

  // Across a DST transition the trailing local day can be 23 or 25 hours, so
  // this remainder may briefly read 24 hours rather than rolling into a day.
  const hours = Math.floor(remainder / 3600);
  remainder -= hours * 3600;
  const minutes = Math.floor(remainder / 60);
  const seconds = remainder - minutes * 60;

  return {
    years: Math.floor(months / 12),
    months: months % 12,
    days,
    hours,
    minutes,
    seconds,
  };
}
