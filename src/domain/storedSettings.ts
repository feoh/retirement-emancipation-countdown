import {
  DEFAULT_SETTINGS,
  SCHEMA_VERSION,
  settingsFromUnknown,
  type Settings,
} from "./settings";

export interface StoredSettingsDocument {
  schemaVersion: number;
  settings: Settings;
}

export interface DecodedStoredSettings {
  settings: Settings;
  notice: string | null;
  migrated: boolean;
}

function defaults(notice: string | null): DecodedStoredSettings {
  return {
    settings: {
      ...DEFAULT_SETTINGS,
      workingWeekdays: [...DEFAULT_SETTINGS.workingWeekdays],
    },
    notice,
    migrated: false,
  };
}

export function encodeStoredSettings(
  settings: Settings,
): StoredSettingsDocument {
  return { schemaVersion: SCHEMA_VERSION, settings };
}

export function decodeStoredSettings(value: unknown): DecodedStoredSettings {
  if (value === null || value === undefined) return defaults(null);
  if (typeof value !== "object") {
    return defaults(
      "Your saved settings could not be read. Defaults are shown instead.",
    );
  }

  const document = value as Record<string, unknown>;
  if (!("schemaVersion" in document)) {
    const legacy = settingsFromUnknown(document, true);
    if (!legacy.ok) {
      return defaults(
        "Your saved settings could not be read. Defaults are shown instead.",
      );
    }
    return { settings: legacy.settings, notice: null, migrated: true };
  }

  if (typeof document.schemaVersion !== "number") {
    return defaults(
      "Your saved settings could not be read. Defaults are shown instead.",
    );
  }
  if (document.schemaVersion > SCHEMA_VERSION) {
    return defaults(
      "These settings were created by a newer app version and were left unchanged.",
    );
  }
  if (document.schemaVersion < SCHEMA_VERSION) {
    return defaults(
      "These settings use an unsupported older format and were left unchanged.",
    );
  }

  const parsed = settingsFromUnknown(document.settings);
  return parsed.ok
    ? { settings: parsed.settings, notice: null, migrated: false }
    : defaults(
        "Your saved settings could not be read. Defaults are shown instead.",
      );
}
