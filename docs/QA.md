# Retirement Countdown — QA Status

Last updated: 2026-09-17 (physical iPhone verification)

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

Re-verified 2026-09-17 on the **macOS** host (Prettier, ESLint, `tsc`, Vitest in
all four timezones, `cargo fmt`, `cargo clippy --all-targets -D warnings`, and
`cargo check --target aarch64-apple-ios`): identical results to the Linux host,
confirming the baseline is not Linux-specific.

GitHub Actions repeats frontend, Rust, timezone, and integrated Tauri build
checks on pushes to `main` and pull requests.

## Physical-device release gates

These remain release blockers and must not be inferred from desktop-green CI. Status
as of 2026-09-17; the Android entries were cleared from the Linux host per
`FEASIBILITY.md` §8 and the iOS entries on the Mac (see that document §7 for the
criteria and remaining caveats):

- [x] G1: Android SDK + NDK installed, all four Rust targets added, `tauri android init`
      and a debug `tauri android build` succeed for `aarch64` (the real device arch).
      Verified further by running the `x86_64` build on an emulator: onboarding,
      persisted-settings load, the full dashboard (countdown, working-day/vacation
      estimate, daily message), and the native date picker all render and function
      correctly with no crash. **Still open:** a true physical Android device has not
      run this build; only an AVD emulator was available on this host.
- [x] G2 (build half): on macOS, `tauri ios init` completed after installing the
      required Xcode support tools; `aarch64-apple-ios`, `aarch64-apple-ios-sim`,
      and `x86_64-apple-ios` Rust targets are installed. `cargo check --target
      aarch64-apple-ios` passed, and unsigned `tauri ios build --debug --target
      aarch64` plus an arm64 simulator build both completed. **Cleared 2026-09-17:**
      a signed debug build installs, launches, and runs correctly on a physical
      iPhone (iOS 27.0) after the UIScene fix in commit `3ecab68`. **Still open:**
      release builds do not link — see "Open defect: iOS release builds fail to
      link" below.
- [x] G3 (Android manifest half only): `android:allowBackup="true"` is now explicit in
      `AndroidManifest.xml` (previously relying on the implicit default). Confirmed the
      settings file (`settings.json`) is written directly under the app's private data
      root, outside the `cache/`, `code_cache/`, and `no_backup/` directories Auto Backup
      excludes by default. **iOS half cleared 2026-09-17:** on device the store writes to
      `Library/Application Support/com.feoh.retirementcountdown/settings.json`, which iOS
      includes in backups by default — it is outside `Library/Caches` and `tmp`, and
      carries no exclusion attribute. **Still open:** an actual restore-to-a-second-device
      round-trip on either platform (Android `bmgr`, or an iOS encrypted-backup restore).
- [ ] G4: could not exercise interactively — see the dialog-input finding below.
      Needs a physical device or a working-input emulator/Android Studio session.
- [ ] G5: measure fireworks at a 60 fps target / 30 fps floor and verify background teardown.
      Not measurable on a headless `swiftshader` software-rendered emulator; needs a
      physical mid-range Android device.
- [ ] G6: safe-area CSS (`viewport-fit=cover`, `env(safe-area-inset-*)`) is already in
      place in `index.html`/`App.css`. Visual confirmation on a notched/cutout device
      still needed.
- [x] G7: `tauri-plugin-haptics` 2.3.3 compiled and linked cleanly into both the Android
      debug build and `cargo check --target aarch64-apple-ios` (Kotlin `HapticsPlugin`
      compiled on Android; the iOS Rust target resolved the mobile plugin) — the
      "never been built for mobile" open question from the feasibility doc is resolved.
      Confirmed further on 2026-09-17: the plugin links into a real signed iOS device
      build that runs. Whether haptics actually *fire* on device is untested.
- [ ] Exercise clean install, suspend/resume, local-midnight retirement transition, timezone change,
      reduced motion, offline operation, and same-platform/cross-platform transfer on devices.

No automated release-blocking defects are open. Store submission remains blocked
until the physical-device matrix above is complete, and in particular until the
physical iOS G2 run, G4, G5, and a real-device G1/G3 pass are done on actual
hardware.

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

### Mac iOS build verification (2026-09-16)

On the macOS build host, `tauri ios init` generated and committed the Xcode project
under `src-tauri/gen/apple/`. The device-target build produces an unsigned IPA, and
the arm64 simulator target installs and launches on an iPhone 17 Pro simulator. The
simulator screenshot confirms the Dynamic Island safe-area layout. This verifies the
Apple project generation and compile/link path, but it is not a substitute for a
signed physical-device install, backup restore, picker interaction, or haptics test.

### Physical iPhone verification (2026-09-17)

The app now **builds, signs, installs, launches, and persists settings on a physical
iPhone** (`iPhone17,3`, iOS 27.0 build `24A435`), which closes G2 — the last
existential iOS gate. Getting there required Xcode 27 (the previously installed 26.6
topped out at the iOS 26.5 SDK and could not target an iOS 27 device) and three
project fixes, all in commit `3ecab68`.

#### Release-blocking defect found and fixed: no UIScene adoption

The first signed build installed and then vanished instantly on launch. The crash
report showed `EXC_BREAKPOINT` / `SIGTRAP` in
`__UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`.

iOS 26 and later run every app on the UIScene lifecycle and trap at launch if the app
never adopts it. `tao` 0.35.3 — the version stable Tauri 2 pins — only registers its
`application:configurationForConnectingSceneSession:options:` handler, and therefore
only installs `TaoSceneDelegate`, when the Info.plist declares
`UIApplicationSceneManifest` with `UIApplicationSupportsMultipleScenes` set to **true**
(see `multiple_scenes_enabled()` in tao's `ios/scene.rs`). The generated project
declared no manifest at all, so no app built from it could launch on iOS 26+.

Declaring the manifest fixes it. Note that a manifest with the key set to `false` does
**not** work — tao reads the value, not merely the key's presence.

Side effect: enabling multiple scenes permits multi-window on iPad. That is acceptable
for the MVP and is the only route to a launchable app on stable Tauri 2.

Upstream, tao 0.37.0 fixes this properly by always implementing
`configurationForConnectingSceneSession` regardless of the Info.plist. It is not
reachable from here: `tauri-runtime-wry` 2.11.4 (the newest stable) pins `tao ^0.35`,
and only `tauri-runtime-wry` 3.0.0-alpha moves to `tao ^0.37`. Revisit the manifest
workaround when a Tauri 2.x release picks up tao 0.37, or when moving to Tauri 3.

#### Other fixes required by Xcode 27

- **Deployment target.** Xcode 27 supports 15.0 and up, so the pinned 14.0 was a hard
  build error. Raised to 15.0 in both `tauri.conf.json` and `gen/apple/project.yml`.
- **Signing.** `project.yml` carries no team by default and
  `TAURI_APPLE_DEVELOPMENT_TEAM` is only consulted when `tauri ios init` first
  generates the file, which never happens again once it is committed. Added
  `DEVELOPMENT_TEAM` and `CODE_SIGN_STYLE: Automatic` explicitly. Automatic signing
  then provisioned the device without manual steps.

Note that `gen/apple/project.yml` is the real source of truth for the Xcode project;
editing `tauri.conf.json` alone changes nothing, and `tauri ios init` must be re-run to
regenerate the `.xcodeproj` after any `project.yml` change.

#### Verified on device

- Signed debug build installs via `devicectl` and launches, including a cold launch
  from the home screen; the UI renders correctly (confirmed visually by the owner).
- Settings persist to
  `Library/Application Support/com.feoh.retirementcountdown/settings.json`, read back
  intact with a real configuration (`schemaVersion: 1`, retirement date, Mon-Fri
  working week, 20 vacation days).
- `Library/Saved Application State/.../KnownSceneSessions` exists, confirming the app
  really is running on the scene lifecycle now.
- `tauri-plugin-haptics` compiles and links into the device build (G7 for iOS).

### Open defect: iOS release builds fail to link

`tauri ios build` **without** `--debug` fails. Debug builds are unaffected, so this
blocks shipping but not the device QA above. Root cause, in order:

1. Xcode 27's Swift compiler internalizes `@_cdecl` symbols in optimized builds. In
   the release `libTauri.a` the swift-rs entry points are `t` (local); in debug they
   are `T` (global).
2. swift-rs 1.0.8 already anticipates this and re-globalizes them with `llvm-objcopy`,
   but that needs the `llvm-tools` rustup component. Without it the build script only
   prints a warning and carries on, producing 11 undefined symbols. Running
   `rustup component add llvm-tools` resolves 8 of them.
3. Three symbols from swift-rs's own `SwiftRs` helper module — `retain_object`,
   `release_object`, and `string_from_bytes` — stay internalized even then. Manually
   running `llvm-objcopy --globalize-symbol` plus `ranlib` marks them `T` but still
   does not satisfy the linker, most likely because the Mach-O private-extern bit
   survives. swift-rs 1.0.8 is the newest release, so there is no version to move to.

Crucially this only breaks the **`cdylib`** crate type, which must resolve every
symbol. iOS links the **`staticlib`** (`libapp.a`), and that builds fine in release:
`cargo rustc --release --target aarch64-apple-ios --lib --crate-type staticlib`
succeeds. The failure only happens because `tauri ios build` runs `cargo build --lib`,
which builds every crate type in `Cargo.toml` including the `cdylib` that iOS never
uses. `cdylib` still needs to stay in `Cargo.toml` for Android.

So this is an upstream interaction between Xcode 27, swift-rs, and the Tauri CLI, not
a defect in this app. It must be resolved before store submission.
