import { load, type Store } from "@tauri-apps/plugin-store";
import {
  decodeStoredSettings,
  encodeStoredSettings,
  type DecodedStoredSettings,
} from "./domain/storedSettings";
import { DEFAULT_SETTINGS, type Settings } from "./domain/settings";

const STORE_FILE = "settings.json";
const SETTINGS_KEY = "settings";

let storePromise: Promise<Store> | null = null;

function getStore(): Promise<Store> {
  storePromise ??= load(STORE_FILE, { autoSave: 500 });
  return storePromise;
}

function unavailableSettings(): DecodedStoredSettings {
  return {
    settings: {
      ...DEFAULT_SETTINGS,
      workingWeekdays: [...DEFAULT_SETTINGS.workingWeekdays],
    },
    notice: "Settings storage is unavailable. Your changes may not be saved.",
    migrated: false,
  };
}

export async function loadSettings(): Promise<DecodedStoredSettings> {
  try {
    const store = await getStore();
    const decoded = decodeStoredSettings(
      await store.get<unknown>(SETTINGS_KEY),
    );
    if (decoded.migrated) {
      await store.set(SETTINGS_KEY, encodeStoredSettings(decoded.settings));
      await store.save();
    }
    return decoded;
  } catch {
    storePromise = null;
    return unavailableSettings();
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  try {
    const store = await getStore();
    await store.set(SETTINGS_KEY, encodeStoredSettings(settings));
  } catch (error) {
    storePromise = null;
    throw error;
  }
}

export async function flushSettings(): Promise<void> {
  try {
    const store = await getStore();
    await store.save();
  } catch (error) {
    storePromise = null;
    throw error;
  }
}
