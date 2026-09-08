import { describe, expect, it } from "vitest";
import {
  DEFAULT_WORKING_WEEKDAYS,
  countWorkingDays,
  estimateWorkingTime,
  type WorkingWeekdays,
} from "./workdays";

const NONE: WorkingWeekdays = [false, false, false, false, false, false, false];
const ALL: WorkingWeekdays = [true, true, true, true, true, true, true];
const MONDAY_ONLY: WorkingWeekdays = [
  false,
  true,
  false,
  false,
  false,
  false,
  false,
];

// 2026-06-01 is a Monday.
const MONDAY = new Date(2026, 5, 1);

// countWorkingDays is the raw half-open-interval primitive; the "start from
// tomorrow" product rule lives in estimateWorkingTime and is tested there.
describe("countWorkingDays", () => {
  it("counts a single Mon-Fri week", () => {
    expect(countWorkingDays(MONDAY, new Date(2026, 5, 8), DEFAULT_WORKING_WEEKDAYS)).toBe(5);
  });

  it("excludes the retirement day itself", () => {
    // Mon-Fri, retiring on the Friday: Mon-Thu are the working days.
    expect(countWorkingDays(MONDAY, new Date(2026, 5, 5), DEFAULT_WORKING_WEEKDAYS)).toBe(4);
  });

  it("includes the start day when it is a working day", () => {
    expect(countWorkingDays(MONDAY, new Date(2026, 5, 2), DEFAULT_WORKING_WEEKDAYS)).toBe(1);
  });

  it("ignores the time of day on the start date", () => {
    const lateMonday = new Date(2026, 5, 1, 23, 30);
    expect(countWorkingDays(lateMonday, new Date(2026, 5, 2), DEFAULT_WORKING_WEEKDAYS)).toBe(1);
  });

  it("skips weekends", () => {
    const saturday = new Date(2026, 5, 6);
    expect(countWorkingDays(saturday, new Date(2026, 5, 8), DEFAULT_WORKING_WEEKDAYS)).toBe(0);
  });

  it("is zero when the target is today or earlier", () => {
    expect(countWorkingDays(MONDAY, MONDAY, DEFAULT_WORKING_WEEKDAYS)).toBe(0);
    expect(countWorkingDays(MONDAY, new Date(2026, 4, 1), DEFAULT_WORKING_WEEKDAYS)).toBe(0);
  });

  it("is zero when no weekdays are selected", () => {
    expect(countWorkingDays(MONDAY, new Date(2027, 5, 1), NONE)).toBe(0);
  });

  it("counts every day when all weekdays are selected", () => {
    expect(countWorkingDays(MONDAY, new Date(2026, 5, 29), ALL)).toBe(28);
  });

  it("handles a single selected weekday over four weeks", () => {
    expect(countWorkingDays(MONDAY, new Date(2026, 5, 29), MONDAY_ONLY)).toBe(4);
  });

  it("handles a partial trailing week", () => {
    // Mon 1 Jun -> Wed 10 Jun exclusive: one full week (5) + Mon 8, Tue 9.
    expect(countWorkingDays(MONDAY, new Date(2026, 5, 10), DEFAULT_WORKING_WEEKDAYS)).toBe(7);
  });
});

describe("estimateWorkingTime", () => {
  it("reports untracked when no weekdays are selected", () => {
    const result = estimateWorkingTime(MONDAY, new Date(2027, 5, 1), NONE, 20);
    expect(result.tracked).toBe(false);
    expect(result.netWorkingWeeks).toBeNull();
  });

  it("excludes today, counting from tomorrow", () => {
    // Mon 1 Jun, retiring Mon 8 Jun: Tue-Fri remain, not Mon-Fri.
    const result = estimateWorkingTime(MONDAY, new Date(2026, 5, 8), DEFAULT_WORKING_WEEKDAYS, 0);
    expect(result.rawWorkingDays).toBe(4);
    expect(result.vacationDays).toBe(0);
    expect(result.netWorkingDays).toBe(4);
  });

  it("excludes today regardless of the time of day", () => {
    const earlyMonday = estimateWorkingTime(
      new Date(2026, 5, 1, 0, 1),
      new Date(2026, 5, 8),
      DEFAULT_WORKING_WEEKDAYS,
      0,
    );
    const lateMonday = estimateWorkingTime(
      new Date(2026, 5, 1, 23, 59),
      new Date(2026, 5, 8),
      DEFAULT_WORKING_WEEKDAYS,
      0,
    );
    expect(earlyMonday.rawWorkingDays).toBe(4);
    expect(lateMonday.rawWorkingDays).toBe(4);
  });

  it("is zero on the last working day, with only the weekend left", () => {
    // Fri 5 Jun, retiring Mon 8 Jun: only Sat and Sun remain.
    const result = estimateWorkingTime(
      new Date(2026, 5, 5),
      new Date(2026, 5, 8),
      DEFAULT_WORKING_WEEKDAYS,
      0,
    );
    expect(result.rawWorkingDays).toBe(0);
    expect(result.netWorkingDays).toBe(0);
  });

  it("prorates the annual allowance across the remaining span", () => {
    // Exactly one year out, so the full allowance applies.
    const result = estimateWorkingTime(MONDAY, new Date(2027, 5, 1), DEFAULT_WORKING_WEEKDAYS, 20);
    expect(result.vacationDays).toBe(19); // floor(20 * 365/365.2425)
    expect(result.netWorkingDays).toBe(result.rawWorkingDays - 19);
  });

  it("prorates down for a short remaining span", () => {
    // Half a year out should yield roughly half the allowance.
    const result = estimateWorkingTime(MONDAY, new Date(2026, 11, 1), DEFAULT_WORKING_WEEKDAYS, 20);
    expect(result.vacationDays).toBeGreaterThan(8);
    expect(result.vacationDays).toBeLessThan(11);
  });

  it("never subtracts more vacation than there are working days", () => {
    // 91 calendar days from tomorrow prorates to 90 vacation days but only 65
    // are worked, so the clamp has to engage.
    const result = estimateWorkingTime(MONDAY, new Date(2026, 8, 1), DEFAULT_WORKING_WEEKDAYS, 365);
    expect(result.rawWorkingDays).toBe(65);
    expect(result.vacationDays).toBe(65);
    expect(result.netWorkingDays).toBe(0);
  });

  it("never returns negative net working days", () => {
    const result = estimateWorkingTime(MONDAY, new Date(2025, 0, 1), DEFAULT_WORKING_WEEKDAYS, 30);
    expect(result.netWorkingDays).toBeGreaterThanOrEqual(0);
  });

  it("computes weeks from the selected weekday count", () => {
    // From Tue 2 Jun to Mon 29 Jun exclusive: Mondays on 8, 15 and 22.
    const result = estimateWorkingTime(MONDAY, new Date(2026, 5, 29), MONDAY_ONLY, 0);
    expect(result.rawWorkingDays).toBe(3);
    expect(result.netWorkingWeeks).toBe(3);
  });
});
