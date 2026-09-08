# Retirement Countdown — MVP Specification

Status: approved for implementation (discovery phase output)
Applies to: v1.0 (iOS + Android, local-first, no accounts, no backend)

## 1. Product summary

A single-user, local-first countdown to a self-declared retirement date. The app
answers two questions at a glance:

1. How much **calendar time** is left?
2. How much **working time** is left, once non-working weekdays and vacation are
   taken out?

It rotates a daily message, and when the date arrives it switches permanently
into a celebratory retirement mode.

## 2. Core domain rules

### 2.1 The retirement moment

The user configures a **first retired day** (a calendar date, no time-of-day).

> **Retirement occurs at 00:00:00 local time at the start of the first retired day.**

Consequences, all intentional:

- The countdown reaches zero as that day begins, not ends.
- The final working day is the last selected working weekday strictly *before*
  the first retired day.
- The moment is a **local wall-clock** moment. If the device timezone changes,
  the target moves with it. We do not pin a UTC instant — a user who retires in
  a new timezone should retire at local midnight there.

### 2.2 Calendar countdown decomposition

Displayed as years, months, days, hours, minutes, seconds.

Decomposition is **calendar-aware**, computed by greedy calendar-unit descent
against local wall-clock components, not by dividing a millisecond total:

1. Add whole calendar years to *now* while the result does not pass the target.
2. Then add whole calendar months the same way.
3. Then whole days.
4. The remainder becomes hours, minutes, seconds.

This yields stable, human-meaningful values ("2 years, 3 months, 4 days") and
avoids the "365-day year" drift that makes fixed-length arithmetic look wrong
around February and month boundaries.

Rules:

- Months are calendar months of whatever real length they have.
- If a day-of-month does not exist in the target month (e.g. Jan 31 + 1 month),
  clamp to the last day of that month.
- Across a DST transition, the day count is derived from local calendar dates,
  so a "day" stays one calendar day even when it is 23 or 25 hours long. The
  hours/minutes/seconds remainder absorbs the offset change.

### 2.3 Working weekday counting

The user selects which weekdays they actually work. Default: Monday–Friday.

- Count every selected weekday in the half-open interval
  `[today_local, first_retired_day)`.
- **Today counts as a whole working day** if it is a selected weekday, however
  little of it is left. Partial days are never fractional. This is the honest
  simplification: the app cannot know the user's shift hours, and rounding a
  partial day down would make the number drop by one mid-morning for no visible
  reason.
- If the user selects **zero** working weekdays, working-time output is not an
  error — the working-time section is replaced with "not tracked". This keeps a
  legitimate configuration (no fixed schedule) out of a validation dead end.

### 2.4 Vacation proration

The user configures a **recurring annual vacation allowance** in whole days.

Remaining vacation is **prorated across the remaining calendar span**, not
tracked per accrual year:

```
vacationRemaining = floor(allowancePerYear * (remainingCalendarDays / 365.2425))
vacationRemaining = clamp(vacationRemaining, 0, rawWorkingDays)
netWorkingDays    = rawWorkingDays - vacationRemaining
```

Deliberate simplifications, to be stated in the UI as "estimated":

- **No accrual anniversary setting.** Because we prorate over the whole
  remaining span, the position of the accrual year boundary barely moves the
  result, and asking for it would add a setting that mostly cannot be answered
  precisely.
- **No carry-over, no already-booked vacation, no partial days.**
- 365.2425 days/year keeps long horizons from drifting via leap years.

### 2.5 Working time presentation

Derived only from `netWorkingDays`:

- Net working **days**.
- Net working **weeks** = `netWorkingDays / (selected weekdays per week)`, one
  decimal place. Omitted when zero weekdays are selected.

No hours figure and no hours-per-day setting: the app has no basis for a
workday length, and inventing one would present a fabricated number with more
apparent precision than the underlying data.

### 2.6 Retirement mode

Entered when `now >= retirementMoment`.

- The countdown is replaced by a **time-since-retirement** counter using the
  same calendar decomposition.
- The first entry into retirement mode plays the **full fireworks show** once.
  A `hasCelebrated` flag is persisted so it is a one-time event.
- Later launches show a calmer ambient version, with an explicit **Replay the
  show** control.
- Working-time output is hidden entirely — it is meaningless and slightly
  insulting after the fact.
- Changing the retirement date to a future date exits retirement mode and
  resets `hasCelebrated`, so a corrected date still gets its celebration.

### 2.7 Daily message rotation

- One message per local calendar day, drawn from a built-in pool mixing
  humorous and encouraging tones.
- Selection is **deterministic from the local date string**
  (`index = hash("YYYY-MM-DD") % pool.length`), so the message does not shuffle
  when the user reopens the app or the app is relaunched mid-day.
- Retirement mode uses a separate congratulatory pool.
- Messages ship in-app. No network fetch — that would contradict local-first
  and add a permission we otherwise do not need.

## 3. Settings and validation

| Setting | Type | Default | Validation |
|---|---|---|---|
| First retired day | local date | none (onboarding required) | Must be a real calendar date. **May be in the past** — that legitimately means already retired. |
| Working weekdays | set of 7 booleans | Mon–Fri | Any subset, including empty (see §2.3). |
| Annual vacation days | integer | 0 | Clamped to 0–365. Non-integer input rejected at entry. |
| Reduced motion override | tri-state: system / always / never | system | — |

Validation is **inline and non-blocking**: an invalid field shows its own error
and disables only Save, never navigation. There is no modal error dialog.

## 4. Persistence and backup

- Settings live in a single JSON document managed by `tauri-plugin-store`, in
  the OS app-data directory.
- **The store must be backup-eligible on both platforms.** This is the whole
  reason a user does not lose a decade-long countdown when they change phones:
  - Android: application data must be backup-enabled in the manifest.
  - iOS: the file must live where it is included in device/iCloud backup, and
    must *not* be marked excluded-from-backup.
- Writes are debounced and flushed on app background/blur, so a kill after a
  settings change does not lose it.
- A corrupt or unreadable store falls back to defaults and surfaces a
  non-destructive notice rather than crash-looping.

Backup eligibility is a **release gate**, verified per platform — see
`FEASIBILITY.md` §5.

## 5. Export / import

Backup-eligible local storage covers device replacement on the *same* platform.
Export/import covers the cases it cannot: cross-platform moves, and users who
do not trust the platform backup.

Versioned envelope:

```json
{
  "schemaVersion": 1,
  "exportedAt": "2026-09-08T16:00:00.000Z",
  "app": "retirement-countdown",
  "settings": { }
}
```

Import rules:

- `schemaVersion` **missing or not 1** → rejected with a specific message.
  A *newer* version is rejected explicitly ("created by a newer version of the
  app") rather than best-effort parsed, since silently dropping unknown fields
  would quietly discard the user's real configuration.
- Shape and range validation reuses the §3 validation rules; a partially valid
  import is rejected whole, never merged.
- Import **previews** the incoming settings and requires confirmation before
  overwriting, because it is a destructive, non-undoable overwrite of the only
  copy of the user's data.
- `exportedAt` and `app` are informational only.

Transport: see `FEASIBILITY.md` §4 — v1 uses file save/open plus
copy/paste-JSON, and deliberately does **not** depend on a share sheet.

## 6. Accessibility

- `prefers-reduced-motion` is honored by default; the in-app override in §3 can
  force either behavior.
- Reduced motion replaces animated fireworks with a **static celebratory
  illustration**, plus an opt-in "play anyway".
- The fireworks canvas is decorative: it is `aria-hidden`, and the retirement
  state is conveyed by real text so a screen reader user gets the same
  information.
- Countdown values are announced as a single coherent label (e.g. "2 years,
  3 months, 4 days remaining"), not seven separate unlabeled numbers. The
  live-updating seconds are **not** announced continuously.
- Contrast targets WCAG AA. Text scales with OS font-size settings; the
  countdown layout must survive large type without clipping.
- Every control has a minimum 44×44pt touch target.

## 7. Out of scope for v1

Explicitly excluded, each for a reason:

- **Public holidays** — requires a per-country, per-year data source and
  ongoing maintenance; a wrong holiday calendar is worse than none.
- **Accounts, backend, cloud sync** — contradicts local-first; the data is one
  small document that platform backup already handles.
- **Notifications** — needs scheduling permissions and an engagement model the
  app does not otherwise have.
- **Home-screen widgets / watch apps** — native surfaces outside the Tauri
  webview; would need per-platform native code.
- **Multiple retirement profiles**, part-time ramp-downs, already-booked
  vacation, hours-per-day.
- **Share sheet** — see `FEASIBILITY.md` §4; the ecosystem support is not
  there yet.
