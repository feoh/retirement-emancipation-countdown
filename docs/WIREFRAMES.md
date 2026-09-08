# Retirement Countdown — Wireframes

Companion to `SPEC.md`. Portrait phone, ~390pt wide. Layout must survive OS
large-type settings (§6 of the spec), so every screen is a single vertical
scroll with no side-by-side text.

Safe areas: all screens inset content by the top and bottom safe-area insets.
The bottom bar sits above the home indicator; the header clears notch/status.

---

## 1. Onboarding (first launch only)

Shown when no retirement date has been stored. Cannot be skipped — the app has
nothing to show without a date. Working weekdays and vacation are pre-filled
with defaults so a user can finish with one field.

```
┌────────────────────────────────┐
│                                │
│      Retirement Countdown      │
│                                │
│   When is your first day of    │
│         retirement?            │
│                                │
│   ┌────────────────────────┐   │
│   │  2032-06-01         📅 │   │
│   └────────────────────────┘   │
│                                │
│   That first free morning      │
│   starts at midnight.          │
│                                │
│   Which days do you work?      │
│   ┌──┬──┬──┬──┬──┬──┬──┐      │
│   │M │T │W │T │F │S │S │      │
│   │● │● │● │● │● │○ │○ │      │
│   └──┴──┴──┴──┴──┴──┴──┘      │
│                                │
│   Vacation days per year       │
│   ┌────────┐                   │
│   │   20   │                   │
│   └────────┘                   │
│                                │
│   ┌────────────────────────┐   │
│   │      Start counting    │   │
│   └────────────────────────┘   │
│                                │
└────────────────────────────────┘
```

---

## 2. Home — counting down

The primary screen. Calendar time is the hero; working time is the secondary
block because it is an *estimate* and should not outrank the exact figure.

```
┌────────────────────────────────┐
│  Retirement Countdown      ⚙  │
├────────────────────────────────┤
│                                │
│        TIME REMAINING          │
│                                │
│     5        7        12       │
│   YEARS   MONTHS    DAYS       │
│                                │
│     06  :  05  :  03           │
│    HRS     MIN     SEC         │
│                                │
│   Tuesday, 1 June 2032         │
│                                │
├────────────────────────────────┤
│  ESTIMATED WORKING TIME        │
│                                │
│      1,204 working days        │
│         240.8 weeks            │
│                                │
│  1,304 working days           │
│  − 100 vacation days     ⓘ    │
│                                │
├────────────────────────────────┤
│  ┌──────────────────────────┐  │
│  │ "Somewhere, a spreadsheet│  │
│  │  is being updated with-  │  │
│  │  out you. Enjoy that."   │  │
│  └──────────────────────────┘  │
│                                │
└────────────────────────────────┘
```

Notes:

- Only the seconds digit ticks every second; the rest re-render on change.
  Screen readers get one combined label, not a live seconds feed (spec §6).
- The `− vacation days` line is the estimate's arithmetic, shown inline so the
  number is never unexplained. `ⓘ` opens a short sheet describing the proration
  rule.
- **Zero working weekdays selected** collapses the middle block to:
  `Working time — not tracked · Choose your working days in Settings`.

---

## 3. Settings

```
┌────────────────────────────────┐
│  ←  Settings                   │
├────────────────────────────────┤
│                                │
│  FIRST DAY OF RETIREMENT       │
│  ┌────────────────────────┐    │
│  │  2032-06-01         📅 │    │
│  └────────────────────────┘    │
│  Counts down to midnight       │
│  local time.                   │
│                                │
│  WORKING DAYS                  │
│  ┌──┬──┬──┬──┬──┬──┬──┐       │
│  │M │T │W │T │F │S │S │       │
│  │● │● │● │● │● │○ │○ │       │
│  └──┴──┴──┴──┴──┴──┴──┘       │
│                                │
│  VACATION                      │
│  Days per year  ┌──────┐       │
│                 │  20  │       │
│                 └──────┘       │
│  ⚠ Enter a whole number        │
│    between 0 and 365.          │
│                                │
│  MOTION                        │
│  ( ) Follow system setting     │
│  (•) Always animate            │
│  ( ) Never animate             │
│                                │
│  DATA                          │
│  ┌────────────────────────┐    │
│  │  Back up & transfer  › │    │
│  └────────────────────────┘    │
│                                │
│  ┌────────────────────────┐    │
│  │         Save           │    │
│  └────────────────────────┘    │
└────────────────────────────────┘
```

Validation is inline (the `⚠` line) and disables only **Save**. The back arrow
always works, discarding edits.

---

## 4. Back up & transfer

Framing matters here: platform backup is the default path and already works, so
this screen is explicitly for the cases it does not cover.

```
┌────────────────────────────────┐
│  ←  Back up & transfer         │
├────────────────────────────────┤
│                                │
│  Your countdown is included    │
│  in this device's normal       │
│  backups. You only need this   │
│  screen to move between iPhone │
│  and Android, or to keep your  │
│  own copy.                     │
│                                │
│  EXPORT                        │
│  ┌────────────────────────┐    │
│  │   Save to a file       │    │
│  └────────────────────────┘    │
│  ┌────────────────────────┐    │
│  │   Copy as text         │    │
│  └────────────────────────┘    │
│                                │
│  IMPORT                        │
│  ┌────────────────────────┐    │
│  │   Open a file          │    │
│  └────────────────────────┘    │
│  ┌────────────────────────┐    │
│  │   Paste text           │    │
│  └────────────────────────┘    │
│                                │
└────────────────────────────────┘
```

### 4a. Import confirmation (required)

Import overwrites the only copy of the user's data and cannot be undone, so it
previews first and never merges (spec §5).

```
┌────────────────────────────────┐
│         Replace settings?      │
│                                │
│  From a backup made            │
│  8 Sep 2026.                   │
│                                │
│  Retirement    2032-06-01      │
│  Working days  Mon–Fri         │
│  Vacation      20 days/yr      │
│                                │
│  This replaces your current    │
│  settings. It can't be undone. │
│                                │
│  ┌─────────┐  ┌─────────────┐  │
│  │ Cancel  │  │   Replace   │  │
│  └─────────┘  └─────────────┘  │
└────────────────────────────────┘
```

Rejection states use the same sheet with a specific reason, e.g.
*"This backup was created by a newer version of the app."*

---

## 5. Retirement mode — first launch (the show)

Plays once, on first entry into retirement mode. Fireworks are a full-bleed
canvas behind the text.

```
┌────────────────────────────────┐
│ ✦        ·  ✧        ✦      · │
│    ✧   ╱|╲      ·        ✧    │
│ ·     ✦ | ✦  ✧      ✦         │
│    ·    ✦        ·       ✧  ✦ │
│                                │
│       YOU ARE RETIRED          │
│                                │
│    Since 1 June 2032           │
│                                │
│         3 days                 │
│      14 : 22 : 09              │
│      of freedom                │
│                                │
│  ✧    ·   ✦        ✧      ·   │
│     ✦        ·   ✦      ✧     │
│                                │
│   ┌────────────────────────┐   │
│   │        Continue        │   │
│   └────────────────────────┘   │
└────────────────────────────────┘
```

The canvas is `aria-hidden`; "YOU ARE RETIRED" and the elapsed label carry the
meaning for assistive tech.

### 5a. Reduced motion

When reduced motion applies, the animation is replaced — not merely slowed —
by a static illustration, with animation available on demand.

```
┌────────────────────────────────┐
│                                │
│      ✦   ✧   ✦   ✧   ✦        │
│     (static illustration)      │
│                                │
│       YOU ARE RETIRED          │
│                                │
│    Since 1 June 2032           │
│                                │
│         3 days                 │
│      14 : 22 : 09              │
│      of freedom                │
│                                │
│   ┌────────────────────────┐   │
│   │   Play the show ▷      │   │
│   └────────────────────────┘   │
│   ┌────────────────────────┐   │
│   │        Continue        │   │
│   └────────────────────────┘   │
└────────────────────────────────┘
```

---

## 6. Retirement mode — steady state

Every launch after the show. Calm by default; the spectacle is opt-in.

```
┌────────────────────────────────┐
│  Retirement Countdown      ⚙  │
├────────────────────────────────┤
│                                │
│        YOU ARE RETIRED         │
│                                │
│     0        3        14       │
│   YEARS   MONTHS    DAYS       │
│                                │
│     06  :  05  :  03           │
│    HRS     MIN     SEC         │
│                                │
│   of freedom, since            │
│   1 June 2032                  │
│                                │
├────────────────────────────────┤
│  ┌──────────────────────────┐  │
│  │ "Your calendar is empty  │  │
│  │  and that is the point." │  │
│  └──────────────────────────┘  │
│                                │
│  ┌──────────────────────────┐  │
│  │    Replay the show ▷     │  │
│  └──────────────────────────┘  │
└────────────────────────────────┘
```

The working-time block is gone entirely, per spec §2.6.
