import { DEFAULT_WORKING_WEEKDAYS, type WorkingWeekdays } from "./workdays";

export const SCHEMA_VERSION = 1;
export const APP_ID = "retirement-countdown";

export type MotionPreference = "system" | "always" | "never";

export interface Settings {
  /** Local calendar date as `YYYY-MM-DD`; deliberately not an instant. */
  firstRetiredDay: string;
  workingWeekdays: WorkingWeekdays;
  vacationDaysPerYear: number;
  motion: MotionPreference;
  hasCelebrated: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  firstRetiredDay: "",
  workingWeekdays: DEFAULT_WORKING_WEEKDAYS,
  vacationDaysPerYear: 0,
  motion: "system",
  hasCelebrated: false,
};

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseLocalDate(value: string): Date | null {
  const match = DATE_PATTERN.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);

  const roundTrips =
    date.getFullYear() === year &&
    date.getMonth() === month &&
    date.getDate() === day;
  return roundTrips ? date : null;
}

export function formatLocalDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function formatDisplayDate(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export type ValidationErrors = Partial<Record<keyof Settings, string>>;

export function validate(settings: Settings): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!parseLocalDate(settings.firstRetiredDay)) {
    errors.firstRetiredDay = "Enter a real date as YYYY-MM-DD.";
  }

  const vacation = settings.vacationDaysPerYear;
  if (!Number.isInteger(vacation) || vacation < 0 || vacation > 365) {
    errors.vacationDaysPerYear = "Enter a whole number between 0 and 365.";
  }

  return errors;
}

export type SettingsParseResult =
  { ok: true; settings: Settings } | { ok: false; error: string };

export function settingsFromUnknown(
  value: unknown,
  allowLegacyDefaults = false,
): SettingsParseResult {
  if (typeof value !== "object" || value === null) {
    return { ok: false, error: "Settings are missing or unreadable." };
  }

  const incoming = value as Record<string, unknown>;
  const weekdays = incoming.workingWeekdays;
  if (
    !Array.isArray(weekdays) ||
    weekdays.length !== 7 ||
    weekdays.some((day) => typeof day !== "boolean")
  ) {
    return { ok: false, error: "Working days are unreadable." };
  }

  const motion =
    incoming.motion ?? (allowLegacyDefaults ? "system" : undefined);
  if (motion !== "system" && motion !== "always" && motion !== "never") {
    return { ok: false, error: "Motion preference is unreadable." };
  }

  const hasCelebrated =
    incoming.hasCelebrated ?? (allowLegacyDefaults ? false : undefined);
  if (typeof hasCelebrated !== "boolean") {
    return { ok: false, error: "Celebration state is unreadable." };
  }

  if (
    typeof incoming.firstRetiredDay !== "string" ||
    typeof incoming.vacationDaysPerYear !== "number"
  ) {
    return { ok: false, error: "Retirement settings are unreadable." };
  }

  const settings: Settings = {
    firstRetiredDay: incoming.firstRetiredDay,
    workingWeekdays: weekdays as unknown as WorkingWeekdays,
    vacationDaysPerYear: incoming.vacationDaysPerYear,
    motion,
    hasCelebrated,
  };
  const firstError = Object.values(validate(settings))[0];
  return firstError ? { ok: false, error: firstError } : { ok: true, settings };
}

export interface ExportEnvelope {
  schemaVersion: number;
  exportedAt: string;
  app: string;
  settings: Settings;
}

export function exportSettings(
  settings: Settings,
  now: Date = new Date(),
): ExportEnvelope {
  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    app: APP_ID,
    settings,
  };
}

export type ImportResult =
  | { ok: true; settings: Settings; exportedAt: string | null }
  | { ok: false; error: string };

export function importSettings(raw: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "This isn't a valid backup file." };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return { ok: false, error: "This isn't a valid backup file." };
  }

  const envelope = parsed as Partial<ExportEnvelope>;
  const version = envelope.schemaVersion;

  if (typeof version !== "number") {
    return { ok: false, error: "This isn't a valid backup file." };
  }
  if (version > SCHEMA_VERSION) {
    return {
      ok: false,
      error: "This backup was created by a newer version of the app.",
    };
  }
  if (version < SCHEMA_VERSION) {
    return {
      ok: false,
      error: "This backup was created by an unsupported older version.",
    };
  }

  const parsedSettings = settingsFromUnknown(envelope.settings);
  if (!parsedSettings.ok) {
    return {
      ok: false,
      error: `This backup isn't usable: ${parsedSettings.error}`,
    };
  }

  return {
    ok: true,
    settings: parsedSettings.settings,
    exportedAt:
      typeof envelope.exportedAt === "string" ? envelope.exportedAt : null,
  };
}
