import { useEffect, useMemo, useRef, useState } from "react";
import {
  validate,
  type MotionPreference,
  type Settings,
} from "./domain/settings";
import type { WorkingWeekdays } from "./domain/workdays";

const WEEKDAYS = [
  { index: 1, short: "M", name: "Monday" },
  { index: 2, short: "T", name: "Tuesday" },
  { index: 3, short: "W", name: "Wednesday" },
  { index: 4, short: "T", name: "Thursday" },
  { index: 5, short: "F", name: "Friday" },
  { index: 6, short: "S", name: "Saturday" },
  { index: 0, short: "S", name: "Sunday" },
];

interface SettingsScreenProps {
  initialSettings: Settings;
  onboarding: boolean;
  onSave: (settings: Settings) => void;
  onCancel?: () => void;
}

export function SettingsScreen({
  initialSettings,
  onboarding,
  onSave,
  onCancel,
}: SettingsScreenProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [draft, setDraft] = useState(initialSettings);
  const [vacationInput, setVacationInput] = useState(
    String(initialSettings.vacationDaysPerYear),
  );

  const candidate = useMemo<Settings>(
    () => ({
      ...draft,
      vacationDaysPerYear:
        vacationInput.trim() === "" ? Number.NaN : Number(vacationInput),
    }),
    [draft, vacationInput],
  );
  const errors = validate(candidate);
  const canSave = Object.keys(errors).length === 0;

  useEffect(() => headingRef.current?.focus(), []);

  function toggleWeekday(index: number) {
    const weekdays = [...draft.workingWeekdays] as unknown as boolean[];
    weekdays[index] = !weekdays[index];
    setDraft({
      ...draft,
      workingWeekdays: weekdays as unknown as WorkingWeekdays,
    });
  }

  function setMotion(motion: MotionPreference) {
    setDraft({ ...draft, motion });
  }

  return (
    <section className="settings-screen" aria-labelledby="settings-title">
      <header className="screen-header">
        {!onboarding && onCancel && (
          <button
            type="button"
            className="back-button"
            aria-label="Discard changes and return to countdown"
            onClick={onCancel}
          >
            ← Back
          </button>
        )}
        <div>
          <p className="eyebrow">{onboarding ? "Welcome" : "Preferences"}</p>
          <h1 ref={headingRef} id="settings-title" tabIndex={-1}>
            {onboarding ? "When does freedom begin?" : "Settings"}
          </h1>
        </div>
      </header>

      {onboarding && (
        <p className="intro">
          That first free morning starts at midnight. Tell us the date and the
          days you really work; you can change everything later.
        </p>
      )}

      <form
        className="settings"
        onSubmit={(event) => {
          event.preventDefault();
          if (canSave) onSave(candidate);
        }}
      >
        <div className="field">
          <label className="field-label" htmlFor="first-retired-day">
            First day of retirement
          </label>
          <input
            id="first-retired-day"
            type="date"
            value={draft.firstRetiredDay}
            aria-invalid={Boolean(errors.firstRetiredDay)}
            aria-describedby="retirement-date-help"
            onChange={(event) =>
              setDraft({ ...draft, firstRetiredDay: event.target.value })
            }
          />
          <span
            id="retirement-date-help"
            className={errors.firstRetiredDay ? "field-error" : "field-hint"}
          >
            {errors.firstRetiredDay ??
              "Past dates are allowed. The countdown ends at midnight local time."}
          </span>
        </div>

        <fieldset className="field fieldset">
          <legend className="field-label">Working days</legend>
          <div className="weekdays">
            {WEEKDAYS.map((weekday) => (
              <button
                key={weekday.name}
                type="button"
                className={
                  draft.workingWeekdays[weekday.index]
                    ? "weekday on"
                    : "weekday"
                }
                aria-label={weekday.name}
                aria-pressed={draft.workingWeekdays[weekday.index]}
                onClick={() => toggleWeekday(weekday.index)}
              >
                {weekday.short}
              </button>
            ))}
          </div>
          <span className="field-hint">
            Choose none if your schedule is irregular; working time will show as
            not tracked.
          </span>
        </fieldset>

        <div className="field">
          <label className="field-label" htmlFor="vacation-days">
            Vacation days per year
          </label>
          <input
            id="vacation-days"
            type="number"
            inputMode="numeric"
            min={0}
            max={365}
            step={1}
            value={vacationInput}
            aria-invalid={Boolean(errors.vacationDaysPerYear)}
            aria-describedby="vacation-help"
            onChange={(event) => setVacationInput(event.target.value)}
          />
          <span
            id="vacation-help"
            className={
              errors.vacationDaysPerYear ? "field-error" : "field-hint"
            }
          >
            {errors.vacationDaysPerYear ??
              "Used to estimate whole working days remaining; no carry-over or booked leave."}
          </span>
        </div>

        <fieldset className="field fieldset">
          <legend className="field-label">Celebration motion</legend>
          <div className="motion-options">
            {(
              [
                ["system", "Use device setting"],
                ["always", "Reduce motion"],
                ["never", "Allow animation"],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="radio-option">
                <input
                  type="radio"
                  name="motion"
                  value={value}
                  checked={draft.motion === value}
                  onChange={() => setMotion(value)}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <button className="primary-button" type="submit" disabled={!canSave}>
          {onboarding ? "Start counting" : "Save settings"}
        </button>
      </form>
    </section>
  );
}
