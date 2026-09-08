import { useEffect, useMemo, useState } from "react";
import { decompose, retirementMoment } from "./domain/calendar";
import { messageForDay } from "./domain/messages";
import {
  DEFAULT_SETTINGS,
  formatLocalDate,
  parseLocalDate,
  validate,
  type Settings,
} from "./domain/settings";
import { estimateWorkingTime, type WorkingWeekdays } from "./domain/workdays";
import { flushSettings, loadSettings, saveSettings } from "./persistence";
import "./App.css";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

function Countdown({ label, from, to }: { label: string; from: Date; to: Date }) {
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

export default function App() {
  const now = useNow();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    loadSettings()
      .then((stored) => {
        setSettings(stored);
        setEditing(!parseLocalDate(stored.firstRetiredDay));
      })
      .catch(() => setEditing(true))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    const flush = () => void flushSettings().catch(() => {});
    window.addEventListener("blur", flush);
    document.addEventListener("visibilitychange", flush);
    return () => {
      window.removeEventListener("blur", flush);
      document.removeEventListener("visibilitychange", flush);
    };
  }, []);

  const errors = validate(settings);
  const target = parseLocalDate(settings.firstRetiredDay);
  const retired = target !== null && now >= retirementMoment(target);

  const working = useMemo(() => {
    if (!target) return null;
    return estimateWorkingTime(
      now,
      retirementMoment(target),
      settings.workingWeekdays,
      settings.vacationDaysPerYear,
    );
    // Recompute per calendar day, not per tick: only the date affects the count.
  }, [
    formatLocalDate(now),
    settings.firstRetiredDay,
    settings.workingWeekdays,
    settings.vacationDaysPerYear,
  ]);

  const message = messageForDay(formatLocalDate(now), retired);

  function update(patch: Partial<Settings>) {
    setSettings((current) => {
      const next = { ...current, ...patch };
      if (Object.keys(validate(next)).length === 0) {
        void saveSettings(next).catch(() => {});
      }
      return next;
    });
  }

  function toggleWeekday(index: number) {
    const next = [...settings.workingWeekdays] as unknown as WorkingWeekdays;
    (next as unknown as boolean[])[index] = !settings.workingWeekdays[index];
    update({ workingWeekdays: next });
  }

  if (!loaded) return <main className="app" />;

  return (
    <main className="app">
      <header className="app-bar">
        <h1>Retirement Countdown</h1>
        <button
          type="button"
          className="icon-button"
          aria-expanded={editing}
          onClick={() => setEditing((open) => !open)}
        >
          {editing ? "Done" : "Settings"}
        </button>
      </header>

      {target && !editing && (
        <>
          {retired ? (
            <Countdown label="You are retired" from={retirementMoment(target)} to={now} />
          ) : (
            <Countdown label="Time remaining" from={now} to={retirementMoment(target)} />
          )}

          {!retired && working && (
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
                </>
              ) : (
                <p className="working-secondary">
                  Not tracked &middot; choose your working days in Settings
                </p>
              )}
            </section>
          )}

          <p className="message">{message}</p>
        </>
      )}

      {editing && (
        <section className="settings">
          <label className="field">
            <span className="field-label">First day of retirement</span>
            <input
              type="date"
              value={settings.firstRetiredDay}
              onChange={(event) => update({ firstRetiredDay: event.target.value })}
            />
            {errors.firstRetiredDay ? (
              <span className="field-error">{errors.firstRetiredDay}</span>
            ) : (
              <span className="field-hint">Counts down to midnight local time.</span>
            )}
          </label>

          <div className="field">
            <span className="field-label">Working days</span>
            <div className="weekdays">
              {WEEKDAY_LABELS.map((label, index) => (
                <button
                  key={index}
                  type="button"
                  className={settings.workingWeekdays[index] ? "weekday on" : "weekday"}
                  aria-pressed={settings.workingWeekdays[index]}
                  onClick={() => toggleWeekday(index)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <label className="field">
            <span className="field-label">Vacation days per year</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={365}
              value={settings.vacationDaysPerYear}
              onChange={(event) =>
                update({ vacationDaysPerYear: Number(event.target.value) })
              }
            />
            {errors.vacationDaysPerYear && (
              <span className="field-error">{errors.vacationDaysPerYear}</span>
            )}
          </label>
        </section>
      )}
    </main>
  );
}
