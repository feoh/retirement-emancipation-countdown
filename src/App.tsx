import { useEffect, useState } from "react";
import { RetirementCelebration } from "./RetirementCelebration";
import { SettingsScreen } from "./SettingsScreen";
import { TransferScreen } from "./TransferScreen";
import { decompose, retirementMoment } from "./domain/calendar";
import { messageForDay } from "./domain/messages";
import {
  DEFAULT_SETTINGS,
  formatDisplayDate,
  formatLocalDate,
  parseLocalDate,
  type Settings,
} from "./domain/settings";
import { estimateWorkingTime } from "./domain/workdays";
import { flushSettings, loadSettings, saveSettings } from "./persistence";
import "./App.css";

function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const update = () => setNow(new Date());
    const updateWhenVisible = () => {
      if (document.visibilityState === "visible") update();
    };
    const timer = window.setInterval(update, 1000);
    document.addEventListener("visibilitychange", updateWhenVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", updateWhenVisible);
    };
  }, []);
  return now;
}

function Countdown({
  label,
  from,
  to,
}: {
  label: string;
  from: Date;
  to: Date;
}) {
  const parts = decompose(from, to);
  const spoken =
    `${parts.years} years, ${parts.months} months, ${parts.days} days, ` +
    `${parts.hours} hours, ${parts.minutes} minutes`;

  return (
    <section className="countdown" aria-label={`${label}: ${spoken}`}>
      <h2 className="section-title">{label}</h2>
      <div className="units" aria-hidden="true">
        <div className="unit">
          <span className="value">{parts.years}</span>
          <span className="unit-label">Years</span>
        </div>
        <div className="unit">
          <span className="value">{parts.months}</span>
          <span className="unit-label">Months</span>
        </div>
        <div className="unit">
          <span className="value">{parts.days}</span>
          <span className="unit-label">Days</span>
        </div>
      </div>
      <div className="clock" aria-hidden="true">
        {String(parts.hours).padStart(2, "0")}
        <span className="colon">:</span>
        {String(parts.minutes).padStart(2, "0")}
        <span className="colon">:</span>
        {String(parts.seconds).padStart(2, "0")}
      </div>
    </section>
  );
}

function StorageNotice({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <aside className="notice" role="status">
      <span>{message}</span>
      <button type="button" onClick={onDismiss}>
        Dismiss
      </button>
    </aside>
  );
}

export default function App() {
  const now = useNow();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState<"dashboard" | "settings" | "transfer">(
    "dashboard",
  );
  const [storageNotice, setStorageNotice] = useState<string | null>(null);

  useEffect(() => {
    loadSettings()
      .then((result) => {
        setSettings(result.settings);
        setStorageNotice(result.notice);
      })
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    const flush = () => {
      void flushSettings().catch(() =>
        setStorageNotice(
          "The latest settings could not be flushed to storage. Keep the app open and try again.",
        ),
      );
    };
    const flushWhenHidden = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("blur", flush);
    document.addEventListener("visibilitychange", flushWhenHidden);
    return () => {
      window.removeEventListener("blur", flush);
      document.removeEventListener("visibilitychange", flushWhenHidden);
    };
  }, []);

  if (!loaded) return <main className="app" aria-busy="true" />;

  const target = parseLocalDate(settings.firstRetiredDay);
  const onboarding = target === null;

  function commitSettings(next: Settings) {
    const nextTarget = parseLocalDate(next.firstRetiredDay);
    const resetCelebration =
      nextTarget !== null && now < retirementMoment(nextTarget);
    const saved = {
      ...next,
      hasCelebrated: resetCelebration ? false : next.hasCelebrated,
    };
    setSettings(saved);
    setView("dashboard");
    void saveSettings(saved).catch(() =>
      setStorageNotice(
        "Settings could not be saved. They will remain on screen while the app is open.",
      ),
    );
  }

  if (onboarding || view === "settings") {
    return (
      <main className="app">
        {storageNotice && (
          <StorageNotice
            message={storageNotice}
            onDismiss={() => setStorageNotice(null)}
          />
        )}
        <SettingsScreen
          initialSettings={settings}
          onboarding={onboarding}
          onSave={commitSettings}
          onCancel={onboarding ? undefined : () => setView("dashboard")}
        />
      </main>
    );
  }

  if (view === "transfer") {
    return (
      <main className="app">
        {storageNotice && (
          <StorageNotice
            message={storageNotice}
            onDismiss={() => setStorageNotice(null)}
          />
        )}
        <TransferScreen
          settings={settings}
          onBack={() => setView("dashboard")}
          onImport={commitSettings}
        />
      </main>
    );
  }

  const retirement = retirementMoment(target);
  const retired = now >= retirement;
  const working = estimateWorkingTime(
    now,
    retirement,
    settings.workingWeekdays,
    settings.vacationDaysPerYear,
  );
  const message = messageForDay(formatLocalDate(now), retired);

  function markCelebrated() {
    if (settings.hasCelebrated) return;
    const celebrated = { ...settings, hasCelebrated: true };
    setSettings(celebrated);
    void saveSettings(celebrated).catch(() =>
      setStorageNotice(
        "The celebration was shown, but its saved state could not be updated.",
      ),
    );
  }

  return (
    <main className="app">
      <header className="app-bar">
        <div>
          <h1>Retirement Countdown</h1>
          <p className="target-date">
            {retired ? "Retired since" : "First free day"}:{" "}
            {formatDisplayDate(target)}
          </p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="icon-button"
            onClick={() => setView("transfer")}
          >
            Back up
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={() => setView("settings")}
          >
            Settings
          </button>
        </div>
      </header>

      {storageNotice && (
        <StorageNotice
          message={storageNotice}
          onDismiss={() => setStorageNotice(null)}
        />
      )}

      {retired ? (
        <RetirementCelebration
          motion={settings.motion}
          firstVisit={!settings.hasCelebrated}
          onFirstVisit={markCelebrated}
        >
          <Countdown label="Retired for" from={retirement} to={now} />
        </RetirementCelebration>
      ) : (
        <Countdown label="Time remaining" from={now} to={retirement} />
      )}

      {!retired && (
        <section className="working">
          <h2 className="section-title">Estimated working time</h2>
          {working.tracked ? (
            <>
              <p className="working-primary">
                {working.netWorkingDays.toLocaleString()} working days
              </p>
              {working.netWorkingWeeks !== null && (
                <p className="working-secondary">
                  {working.netWorkingWeeks.toLocaleString()} weeks
                </p>
              )}
              <p className="working-maths">
                {working.rawWorkingDays.toLocaleString()} working days &minus;{" "}
                {working.vacationDays.toLocaleString()} vacation days
              </p>
              <details className="estimate-details">
                <summary>How this estimate works</summary>
                <p>
                  We count your selected weekdays from tomorrow through the day
                  before retirement, then subtract a prorated share of your
                  recurring annual vacation allowance. Public holidays,
                  carry-over, and already-booked leave are not included.
                </p>
              </details>
            </>
          ) : (
            <p className="working-secondary">
              Not tracked &middot; choose your working days in Settings
            </p>
          )}
        </section>
      )}

      <p className="message">{message}</p>
    </main>
  );
}
