# Retirement Countdown — QA Status

Last updated: 2026-09-08

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

GitHub Actions repeats frontend, Rust, timezone, and integrated Tauri build
checks on pushes to `main` and pull requests.

## Physical-device release gates

These remain release blockers and must not be inferred from desktop-green CI:

- [ ] G1: initialize Android targets and run a physical Android build.
- [ ] G2: initialize iOS targets on macOS and run a physical iPhone build.
- [ ] G3: verify Android Auto Backup and iOS/iCloud Backup restore to a second device.
- [ ] G4: verify native picker file paths/content URIs; retain clipboard JSON as fallback.
- [ ] G5: measure fireworks at a 60 fps target / 30 fps floor and verify background teardown.
- [ ] G6: inspect safe areas, large text, keyboard navigation, and screen-reader output on devices.
- [ ] G7: compile/link haptics on both mobile targets or remove the decorative integration.
- [ ] Exercise clean install, suspend/resume, local-midnight retirement transition, timezone change,
      reduced motion, offline operation, and same-platform/cross-platform transfer on devices.

No automated release-blocking defects are open. Store submission remains blocked
until the physical-device matrix above is complete.
