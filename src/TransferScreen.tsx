import { useEffect, useRef, useState } from "react";
import { readText, writeText } from "@tauri-apps/plugin-clipboard-manager";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import {
  exportSettings,
  formatDisplayDate,
  importSettings,
  parseLocalDate,
  type ImportResult,
  type Settings,
} from "./domain/settings";

const JSON_FILTER = [
  { name: "Retirement Countdown backup", extensions: ["json"] },
];
const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

interface TransferScreenProps {
  settings: Settings;
  onBack: () => void;
  onImport: (settings: Settings) => void;
}

export function TransferScreen({
  settings,
  onBack,
  onImport,
}: TransferScreenProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previewHeadingRef = useRef<HTMLHeadingElement>(null);
  const [rawImport, setRawImport] = useState("");
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const backupJson = JSON.stringify(exportSettings(settings), null, 2);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setStatus(null);
    try {
      await action();
    } catch {
      setStatus(
        "That transfer method is unavailable here. Copy or paste the JSON text instead.",
      );
    } finally {
      setBusy(false);
    }
  }

  function review(raw: string) {
    setRawImport(raw);
    const result = importSettings(raw);
    setPreview(result);
    if (!result.ok) setStatus(result.error);
    else setStatus(null);
  }

  const imported = preview?.ok ? preview : null;
  const selectedWeekdays = imported
    ? imported.settings.workingWeekdays
        .map((selected, index) => (selected ? WEEKDAY_NAMES[index] : null))
        .filter((name): name is string => name !== null)
    : [];

  useEffect(() => headingRef.current?.focus(), []);
  useEffect(() => {
    if (imported) previewHeadingRef.current?.focus();
  }, [imported]);

  return (
    <section
      className="settings-screen"
      aria-labelledby="transfer-title"
      aria-busy={busy}
    >
      <header className="screen-header">
        <button
          type="button"
          className="back-button"
          aria-label="Return to countdown"
          onClick={onBack}
        >
          ← Back
        </button>
        <div>
          <p className="eyebrow">Local-first</p>
          <h1 ref={headingRef} id="transfer-title" tabIndex={-1}>
            Back up &amp; transfer
          </h1>
        </div>
      </header>

      <p className="intro">
        Your backup contains only these app settings. Save a JSON file or copy
        the text to move between iOS and Android without an account.
      </p>

      <section className="transfer-card" aria-labelledby="export-title">
        <h2 id="export-title">Export</h2>
        <div className="button-row">
          <button
            className="primary-button"
            type="button"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const path = await save({
                  defaultPath: "retirement-countdown-backup.json",
                  filters: JSON_FILTER,
                });
                if (!path) return;
                await writeTextFile(path, backupJson);
                setStatus("Backup file saved.");
              })
            }
          >
            Save JSON file
          </button>
          <button
            className="secondary-button"
            type="button"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await writeText(backupJson, {
                  label: "Retirement Countdown backup",
                });
                setStatus("Backup JSON copied to the clipboard.");
              })
            }
          >
            Copy JSON
          </button>
        </div>
      </section>

      <section className="transfer-card" aria-labelledby="import-title">
        <h2 id="import-title">Import</h2>
        <p>
          Nothing changes until you review the incoming settings and confirm the
          replacement.
        </p>
        <div className="button-row">
          <button
            className="secondary-button"
            type="button"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const path = await open({
                  multiple: false,
                  directory: false,
                  fileAccessMode: "copy",
                  filters: JSON_FILTER,
                });
                if (!path) return;
                review(await readTextFile(path));
              })
            }
          >
            Open JSON file
          </button>
          <button
            className="secondary-button"
            type="button"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                review(await readText());
              })
            }
          >
            Paste JSON
          </button>
        </div>

        <label className="field transfer-text">
          <span className="field-label">Backup JSON</span>
          <textarea
            value={rawImport}
            rows={7}
            spellCheck={false}
            onChange={(event) => {
              setRawImport(event.target.value);
              setPreview(null);
              setStatus(null);
            }}
          />
        </label>
        <button
          className="secondary-button"
          type="button"
          disabled={!rawImport.trim() || busy}
          onClick={() => review(rawImport)}
        >
          Review imported settings
        </button>
      </section>

      {status && (
        <p className="transfer-status" role="status">
          {status}
        </p>
      )}

      {imported && (
        <section className="import-preview" aria-labelledby="preview-title">
          <h2 ref={previewHeadingRef} id="preview-title" tabIndex={-1}>
            Review replacement
          </h2>
          <dl>
            <div>
              <dt>First retired day</dt>
              <dd>
                {formatDisplayDate(
                  parseLocalDate(imported.settings.firstRetiredDay)!,
                )}
              </dd>
            </div>
            <div>
              <dt>Working days</dt>
              <dd>{selectedWeekdays.join(", ") || "Not tracked"}</dd>
            </div>
            <div>
              <dt>Annual vacation</dt>
              <dd>{imported.settings.vacationDaysPerYear} days</dd>
            </div>
            <div>
              <dt>Motion</dt>
              <dd>{imported.settings.motion}</dd>
            </div>
            {imported.exportedAt && (
              <div>
                <dt>Exported</dt>
                <dd>{new Date(imported.exportedAt).toLocaleString()}</dd>
              </div>
            )}
          </dl>
          <p className="destructive-note">
            This replaces the only settings currently stored on this device.
          </p>
          <div className="button-row">
            <button
              className="danger-button"
              type="button"
              onClick={() => onImport(imported.settings)}
            >
              Replace my settings
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => setPreview(null)}
            >
              Cancel
            </button>
          </div>
        </section>
      )}
    </section>
  );
}
