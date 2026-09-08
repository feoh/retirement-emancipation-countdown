import { describe, expect, it } from "vitest";
import {
  addMonthsLocal,
  addYearsLocal,
  calendarDaysBetween,
  decompose,
  retirementMoment,
} from "./calendar";

describe("addYearsLocal", () => {
  it("clamps leap day when the target year is not a leap year", () => {
    const result = addYearsLocal(new Date(2028, 1, 29), 1);
    expect(result.getFullYear()).toBe(2029);
    expect(result.getMonth()).toBe(1);
    expect(result.getDate()).toBe(28);
  });
});

describe("addMonthsLocal", () => {
  it("clamps to the last day when the target month is shorter", () => {
    const result = addMonthsLocal(new Date(2026, 0, 31), 1);
    expect(result.getMonth()).toBe(1);
    expect(result.getDate()).toBe(28);
  });

  it("clamps to Feb 29 in a leap year", () => {
    const result = addMonthsLocal(new Date(2028, 0, 31), 1);
    expect(result.getDate()).toBe(29);
  });

  it("rolls across a year boundary", () => {
    const result = addMonthsLocal(new Date(2026, 10, 15), 3);
    expect(result.getFullYear()).toBe(2027);
    expect(result.getMonth()).toBe(1);
  });
});

describe("retirementMoment", () => {
  it("is local midnight at the start of the first retired day", () => {
    const moment = retirementMoment(new Date(2032, 5, 1, 17, 30));
    expect(moment.getFullYear()).toBe(2032);
    expect(moment.getMonth()).toBe(5);
    expect(moment.getDate()).toBe(1);
    expect(moment.getHours()).toBe(0);
    expect(moment.getMinutes()).toBe(0);
    expect(moment.getSeconds()).toBe(0);
  });
});

describe("decompose", () => {
  it("returns all zeros once the target has arrived", () => {
    const now = new Date(2032, 5, 1, 0, 0, 0);
    expect(decompose(now, now)).toEqual({
      years: 0,
      months: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    });
  });

  it("returns all zeros when the target is in the past", () => {
    const result = decompose(new Date(2032, 5, 2), new Date(2032, 5, 1));
    expect(result.years).toBe(0);
    expect(result.days).toBe(0);
  });

  it("breaks a whole number of years cleanly", () => {
    const result = decompose(new Date(2026, 5, 1), new Date(2031, 5, 1));
    expect(result).toEqual({
      years: 5,
      months: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    });
  });

  it("uses real calendar months rather than fixed-length ones", () => {
    // Feb 2026 is 28 days; a 365-day-year approach would misreport this.
    const result = decompose(new Date(2026, 1, 1), new Date(2026, 2, 1));
    expect(result.months).toBe(1);
    expect(result.days).toBe(0);
  });

  it("splits years, months and days together", () => {
    const result = decompose(
      new Date(2026, 0, 15, 8, 0, 0),
      new Date(2029, 3, 20, 8, 0, 0),
    );
    expect(result.years).toBe(3);
    expect(result.months).toBe(3);
    expect(result.days).toBe(5);
  });

  it("descends through years before months after leap day", () => {
    const result = decompose(new Date(2028, 1, 29), new Date(2029, 2, 28));
    expect(result).toEqual({
      years: 1,
      months: 1,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    });
  });

  it("carries the time-of-day remainder", () => {
    const result = decompose(
      new Date(2026, 0, 1, 6, 5, 3),
      new Date(2026, 0, 2, 12, 10, 6),
    );
    expect(result.days).toBe(1);
    expect(result.hours).toBe(6);
    expect(result.minutes).toBe(5);
    expect(result.seconds).toBe(3);
  });

  it("borrows correctly when the target time-of-day is earlier", () => {
    const result = decompose(
      new Date(2026, 0, 1, 18, 0, 0),
      new Date(2026, 1, 1, 6, 0, 0),
    );
    expect(result.months).toBe(0);
    expect(result.days).toBe(30);
    expect(result.hours).toBe(12);
  });

  it("never produces negative components", () => {
    const result = decompose(
      new Date(2026, 0, 31, 23, 59, 59),
      new Date(2027, 1, 1, 0, 0, 0),
    );
    for (const value of Object.values(result)) {
      expect(value).toBeGreaterThanOrEqual(0);
    }
  });
});

const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

describe.runIf(timeZone === "America/New_York")(
  "DST behavior in America/New_York",
  () => {
    it("counts calendar days across spring-forward", () => {
      const before = new Date(2026, 2, 7);
      const after = new Date(2026, 2, 9);
      expect(before.getTimezoneOffset()).not.toBe(after.getTimezoneOffset());
      expect(calendarDaysBetween(before, after)).toBe(2);
    });

    it("counts calendar days across fall-back", () => {
      const before = new Date(2026, 9, 31);
      const after = new Date(2026, 10, 2);
      expect(before.getTimezoneOffset()).not.toBe(after.getTimezoneOffset());
      expect(calendarDaysBetween(before, after)).toBe(2);
    });
  },
);

describe("calendarDaysBetween", () => {
  it("counts calendar days regardless of time of day", () => {
    expect(
      calendarDaysBetween(
        new Date(2026, 0, 1, 23, 0),
        new Date(2026, 0, 2, 1, 0),
      ),
    ).toBe(1);
  });

  it("is zero within the same day", () => {
    expect(
      calendarDaysBetween(
        new Date(2026, 0, 1, 0, 1),
        new Date(2026, 0, 1, 23, 59),
      ),
    ).toBe(0);
  });

  it("stays whole across a DST transition", () => {
    // US DST springs forward on 2026-03-08; that local day is only 23 hours.
    expect(
      calendarDaysBetween(new Date(2026, 2, 7), new Date(2026, 2, 9)),
    ).toBe(2);
  });
});
