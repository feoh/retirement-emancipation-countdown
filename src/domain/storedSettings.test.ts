import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, type Settings } from "./settings";
import { decodeStoredSettings, encodeStoredSettings } from "./storedSettings";
import { DEFAULT_WORKING_WEEKDAYS } from "./workdays";

const VALID: Settings = {
  firstRetiredDay: "2032-06-01",
  workingWeekdays: DEFAULT_WORKING_WEEKDAYS,
  vacationDaysPerYear: 20,
  motion: "system",
  hasCelebrated: false,
};

describe("stored settings", () => {
  it("round-trips a versioned document", () => {
    const decoded = decodeStoredSettings(encodeStoredSettings(VALID));
    expect(decoded).toEqual({ settings: VALID, notice: null, migrated: false });
  });

  it("uses independent defaults when no store exists", () => {
    const first = decodeStoredSettings(null);
    const second = decodeStoredSettings(null);
    expect(first.settings).toEqual(DEFAULT_SETTINGS);
    expect(first.notice).toBeNull();
    expect(first.settings.workingWeekdays).not.toBe(
      second.settings.workingWeekdays,
    );
  });

  it("migrates the legacy raw settings document", () => {
    const decoded = decodeStoredSettings({
      firstRetiredDay: VALID.firstRetiredDay,
      workingWeekdays: VALID.workingWeekdays,
      vacationDaysPerYear: VALID.vacationDaysPerYear,
    });
    expect(decoded.settings).toEqual(VALID);
    expect(decoded.migrated).toBe(true);
    expect(decoded.notice).toBeNull();
  });

  it("falls back with a notice without overwriting corrupt data", () => {
    const decoded = decodeStoredSettings({
      schemaVersion: 1,
      settings: { ...VALID, workingWeekdays: [true] },
    });
    expect(decoded.settings).toEqual(DEFAULT_SETTINGS);
    expect(decoded.notice).toMatch(/could not be read/i);
    expect(decoded.migrated).toBe(false);
  });

  it("does not guess at settings from a newer app version", () => {
    const decoded = decodeStoredSettings({
      schemaVersion: 2,
      settings: VALID,
    });
    expect(decoded.settings).toEqual(DEFAULT_SETTINGS);
    expect(decoded.notice).toMatch(/newer app version/i);
  });
});
