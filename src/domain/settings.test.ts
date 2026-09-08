import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  SCHEMA_VERSION,
  exportSettings,
  formatLocalDate,
  importSettings,
  parseLocalDate,
  validate,
  type Settings,
} from "./settings";
import { DEFAULT_WORKING_WEEKDAYS } from "./workdays";

const VALID: Settings = {
  firstRetiredDay: "2032-06-01",
  workingWeekdays: DEFAULT_WORKING_WEEKDAYS,
  vacationDaysPerYear: 20,
  motion: "system",
  hasCelebrated: false,
};

describe("parseLocalDate", () => {
  it("parses a well-formed date as a local date", () => {
    const date = parseLocalDate("2032-06-01")!;
    expect(date.getFullYear()).toBe(2032);
    expect(date.getMonth()).toBe(5);
    expect(date.getDate()).toBe(1);
    expect(date.getHours()).toBe(0);
  });

  it("rejects malformed input", () => {
    expect(parseLocalDate("")).toBeNull();
    expect(parseLocalDate("2032-6-1")).toBeNull();
    expect(parseLocalDate("June 1 2032")).toBeNull();
  });

  it("rejects dates that do not exist", () => {
    expect(parseLocalDate("2026-02-30")).toBeNull();
    expect(parseLocalDate("2026-13-01")).toBeNull();
  });

  it("accepts a real leap day and rejects a fake one", () => {
    expect(parseLocalDate("2028-02-29")).not.toBeNull();
    expect(parseLocalDate("2026-02-29")).toBeNull();
  });

  it("round-trips through formatLocalDate", () => {
    expect(formatLocalDate(parseLocalDate("2032-06-01")!)).toBe("2032-06-01");
  });
});

describe("validate", () => {
  it("accepts valid settings", () => {
    expect(validate(VALID)).toEqual({});
  });

  it("accepts a past retirement date", () => {
    expect(validate({ ...VALID, firstRetiredDay: "2001-01-01" })).toEqual({});
  });

  it("accepts an empty weekday selection", () => {
    const settings = {
      ...VALID,
      workingWeekdays: [false, false, false, false, false, false, false],
    } as Settings;
    expect(validate(settings)).toEqual({});
  });

  it("rejects a missing or invalid date", () => {
    expect(validate(DEFAULT_SETTINGS).firstRetiredDay).toBeDefined();
    expect(validate({ ...VALID, firstRetiredDay: "nope" }).firstRetiredDay).toBeDefined();
  });

  it("rejects out-of-range or fractional vacation days", () => {
    expect(validate({ ...VALID, vacationDaysPerYear: -1 }).vacationDaysPerYear).toBeDefined();
    expect(validate({ ...VALID, vacationDaysPerYear: 366 }).vacationDaysPerYear).toBeDefined();
    expect(validate({ ...VALID, vacationDaysPerYear: 1.5 }).vacationDaysPerYear).toBeDefined();
  });
});

describe("export / import", () => {
  it("round-trips settings through the envelope", () => {
    const raw = JSON.stringify(exportSettings(VALID));
    const result = importSettings(raw);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.settings).toEqual(VALID);
  });

  it("stamps the current schema version", () => {
    expect(exportSettings(VALID).schemaVersion).toBe(SCHEMA_VERSION);
  });

  it("rejects malformed JSON", () => {
    expect(importSettings("{not json").ok).toBe(false);
  });

  it("rejects a payload with no schema version", () => {
    expect(importSettings(JSON.stringify({ settings: VALID })).ok).toBe(false);
  });

  it("rejects a newer schema version with a specific message", () => {
    const result = importSettings(
      JSON.stringify({ ...exportSettings(VALID), schemaVersion: 2 }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/newer version/i);
  });

  it("rejects an older schema version rather than guessing", () => {
    const result = importSettings(
      JSON.stringify({ ...exportSettings(VALID), schemaVersion: 0 }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/older version/i);
  });

  it("rejects a malformed weekday array instead of merging it", () => {
    const result = importSettings(
      JSON.stringify({
        ...exportSettings(VALID),
        settings: { ...VALID, workingWeekdays: [true, false] },
      }),
    );
    expect(result.ok).toBe(false);
  });

  it("rejects an envelope whose settings fail validation", () => {
    const result = importSettings(
      JSON.stringify({
        ...exportSettings(VALID),
        settings: { ...VALID, firstRetiredDay: "2026-02-30" },
      }),
    );
    expect(result.ok).toBe(false);
  });

  it("falls back to system motion when the value is unrecognised", () => {
    const result = importSettings(
      JSON.stringify({
        ...exportSettings(VALID),
        settings: { ...VALID, motion: "disco" },
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.settings.motion).toBe("system");
  });

  it("surfaces the backup timestamp for the confirmation preview", () => {
    const result = importSettings(
      JSON.stringify(exportSettings(VALID, new Date(2026, 8, 8))),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.exportedAt).not.toBeNull();
  });
});
