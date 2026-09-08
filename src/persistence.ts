import { load, type Store } from "@tauri-apps/plugin-store";
import { DEFAULT_SETTINGS, type Settings } from "./domain/settings";

const STORE_FILE = "settings.json";
const SETTINGS_KEY = "settings";

let storePromise: Promise<Store> | null = null;

function getStore(): Promise<Store> {
  storePromise ??= load(STORE_FILE, { autoSave: 500 });
  return storePromise;
}

export async function loadSettings(): Promise<Settings> {
  const store = await getStore();
  const stored = await store.get<Settings>(SETTINGS_KEY);
  return stored ? { ...DEFAULT_SETTINGS, ...stored } : { ...DEFAULT_SETTINGS };
}

export async function saveSettings(settings: Settings): Promise<void> {
  const store = await getStore();
  await store.set(SETTINGS_KEY, settings);
}

export async function flushSettings(): Promise<void> {
  const store = await getStore();
  await store.save();
}
