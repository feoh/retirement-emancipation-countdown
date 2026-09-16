# Retirement Countdown — QA Status

Last updated: 2026-09-16

## Automated baseline

The implementation-phase baseline is green on the Linux development host:

| Check | Result |
|---|---|
| Prettier and ESLint | Pass |
| TypeScript typecheck | Pass |
| Vitest in `America/New_York` | 78 pass |
| Vitest in `UTC`, `Australia/Sydney`, `Asia/Kolkata` | 76 pass, 2 New York-specific DST assertions skipped |
| Production Vite build | Pass |
| `cargo fmt`, Clippy, and `cargo check` | Pass |
| Integrated `tauri build --no-bundle` | Pass |
| Source scan for fetch/XHR/WebSocket usage | No references found |

The suite covers calendar decomposition, leap years and month-end clamping,
spring/fall DST boundaries, one-to-seven-day schedules, vacation proration,
strict import validation, stored-settings migration/recovery, deterministic
message rotation, motion-preference precedence, onboarding form behavior, and
previewed import confirmation.

Re-verified 2026-09-16 (Prettier, ESLint, `tsc`, Vitest across all four
timezones, `cargo fmt`/Clippy/`cargo check`, and the fetch/XHR/WebSocket source
scan): identical results, no regressions.

GitHub Actions repeats frontend, Rust, timezone, and integrated Tauri build
checks on pushes to `main` and pull requests.

## Physical-device release gates

These remain release blockers and must not be inferred from desktop-green CI. Status
as of 2026-09-16, cleared from the Linux host per `FEASIBILITY.md` §8 (see that
document §9 for full evidence and remaining caveats):

- [x] G1: Android SDK + NDK installed, all four Rust targets added, `tauri android init`
      and a debug `tauri android build` succeed for `aarch64` (the real device arch).
      Verified further by running the `x86_64` build on an emulator: onboarding,
      persisted-settings load, the full dashboard (countdown, working-day/vacation
      estimate, daily message), and the native date picker all render and function
      correctly with no crash. **Still open:** a true physical Android device has not
      run this build; only an AVD emulator was available on this host.
- [ ] G2: initialize iOS targets on macOS and run a physical iPhone build. **Blocked —
      Mac only**, per `FEASIBILITY.md` §5.2.
- [x] G3 (Android manifest half only): `android:allowBackup="true"` is now explicit in
      `AndroidManifest.xml` (previously relying on the implicit default). Confirmed the
      settings file (`settings.json`) is written directly under the app's private data
      root, outside the `cache/`, `code_cache/`, and `no_backup/` directories Auto Backup
      excludes by default. **Still open:** an actual Auto Backup round-trip (`bmgr`) to a
      second device, and the entire iOS half (store file location, exclusion flag).
- [ ] G4: could not exercise interactively — see the dialog-input finding below.
      Needs a physical device or a working-input emulator/Android Studio session.
- [ ] G5: measure fireworks at a 60 fps target / 30 fps floor and verify background teardown.
      Not measurable on a headless `swiftshader` software-rendered emulator; needs a
      physical mid-range Android device.
- [ ] G6: safe-area CSS (`viewport-fit=cover`, `env(safe-area-inset-*)`) is already in
      place in `index.html`/`App.css`. Visual confirmation on a notched/cutout device
      still needed.
- [x] G7: `tauri-plugin-haptics` 2.3.3 compiled and linked cleanly into the Android debug
      build (Kotlin `HapticsPlugin` compiled, native lib linked, app runs without a
      JNI/link error) — the "never been built for mobile" open question from the
      feasibility doc is resolved.
- [ ] Exercise clean install, suspend/resume, local-midnight retirement transition, timezone change,
      reduced motion, offline operation, and same-platform/cross-platform transfer on devices.

No automated release-blocking defects are open. Store submission remains blocked
until the physical-device matrix above is complete, and in particular until G2, G4,
G5, and a real-device G1/G3 pass are done on actual hardware.

### Testing-environment finding: dialog touch input on the headless AVD

While smoke-testing on a `-no-window -gpu swiftshader_indirect` AVD (2026-09-16, this
is a **testing-tool limitation, not a confirmed app defect**): `adb shell input tap`
reliably opens the app's first native dialog (the HTML date input's Android
`DatePickerDialog`), and logcat confirms the injected `ACTION_DOWN`/`ACTION_UP` land at
the exact coordinates requested. But no subsequent tap — on a calendar day, `SET`,
`CANCEL`, or a plain dashboard button with no dialog open — had any visible effect,
reproduced across two fresh AVDs. Tapping around a stock Settings app on the same
emulator worked normally, so basic input injection is not broken system-wide.

This blocked exercising G4 (native picker/fs scope) and the backup export/import flow
from the QA task description. Needs reproduction on a physical device or a
non-headless/GPU-accelerated emulator before treating it as either a real product bug
or purely a headless-AVD artifact.
