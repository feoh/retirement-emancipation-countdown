import {
  DAYS_PER_YEAR,
  addDaysLocal,
  calendarDaysBetween,
  startOfLocalDay,
} from "./calendar";

export interface WorkingTime {
  tracked: boolean;
  rawWorkingDays: number;
  vacationDays: number;
  netWorkingDays: number;
  netWorkingWeeks: number | null;
}

/** Weekday flags indexed by `Date.getDay()`, so index 0 is Sunday. */
export type WorkingWeekdays = readonly [
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
];

export const DEFAULT_WORKING_WEEKDAYS: WorkingWeekdays = [
  false,
  true,
  true,
  true,
  true,
  true,
  false,
];

export function countWorkingDays(
  from: Date,
  toExclusive: Date,
  weekdays: WorkingWeekdays,
): number {
  const totalDays = calendarDaysBetween(from, toExclusive);
  if (totalDays <= 0) return 0;

  const perWeek = weekdays.filter(Boolean).length;
  if (perWeek === 0) return 0;

  const fullWeeks = Math.floor(totalDays / 7);
  let count = fullWeeks * perWeek;

  const startDay = startOfLocalDay(from).getDay();
  for (let i = 0; i < totalDays % 7; i++) {
    if (weekdays[(startDay + i) % 7]) count++;
  }
  return count;
}

export function estimateWorkingTime(
  now: Date,
  firstRetiredDay: Date,
  weekdays: WorkingWeekdays,
  vacationDaysPerYear: number,
): WorkingTime {
  const perWeek = weekdays.filter(Boolean).length;
  if (perWeek === 0) {
    return {
      tracked: false,
      rawWorkingDays: 0,
      vacationDays: 0,
      netWorkingDays: 0,
      netWorkingWeeks: null,
    };
  }

  // Today's work is already underway, so the estimate starts tomorrow.
  const start = addDaysLocal(startOfLocalDay(now), 1);

  const rawWorkingDays = countWorkingDays(start, firstRetiredDay, weekdays);
  const remainingCalendarDays = Math.max(
    0,
    calendarDaysBetween(start, firstRetiredDay),
  );

  const prorated = Math.floor(
    vacationDaysPerYear * (remainingCalendarDays / DAYS_PER_YEAR),
  );
  const vacationDays = Math.min(Math.max(prorated, 0), rawWorkingDays);
  const netWorkingDays = rawWorkingDays - vacationDays;

  return {
    tracked: true,
    rawWorkingDays,
    vacationDays,
    netWorkingDays,
    netWorkingWeeks: Math.round((netWorkingDays / perWeek) * 10) / 10,
  };
}
