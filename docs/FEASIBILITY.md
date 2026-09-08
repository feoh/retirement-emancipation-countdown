# Tauri 2 Mobile Feasibility

Date: 2026-09-08
Verdict: **GO, with iOS gated on a macOS machine and five criteria still
unverified on hardware.**

## 1. What was actually verified, and where

The proof of concept was not disposable in the end — it compiled cleanly, so it
was kept and became the real project scaffold in this repository.

**Host used:** CachyOS Linux x86_64, KDE/Wayland. This matters: it bounds what
could be checked.

| # | Claim | Result | Evidence |
|---|---|---|---|
| 1 | Tauri 2 project generation | ✅ Pass | `create-tauri-app@4.7.4`, `react-ts` template |
| 2 | Rust side compiles with the plugins we need | ✅ Pass | `cargo build` clean, 34.78s, tauri 2.11.5 |
| 3 | React + TypeScript build pipeline | ✅ Pass | `tsc` + `vite 8.2.2`, 192 kB JS / **60.6 kB gzip** |
| 4 | Required plugins exist and are current | ✅ Pass | See §3 |
| 5 | Store / fs / dialog / clipboard / os link | ✅ Pass | Registered in `lib.rs`, compiled |
| 6 | Haptics plugin resolves | ⚠️ Partial | Resolves at 2.3.3 but is `cfg`-gated to mobile, so it **was never compiled** |
| 7 | Android build | ❌ Blocked | No SDK/NDK on this host — §5.1 |
| 8 | iOS build | ❌ Blocked | Structurally impossible here — §5.2 |
| 9 | Canvas performance | ❌ Deferred | Not measurable on a desktop GPU — §6 |
| 10 | Safe areas, device persistence, backup eligibility | ❌ Deferred | Requires hardware — §6 |

Rows 7–10 are **not** feasibility doubts about Tauri; they are environmental
gaps. Nothing found suggests the architecture will not work.

## 2. Toolchain baseline

| Component | Version |
|---|---|
| tauri (Rust) | 2.11.5 |
| @tauri-apps/cli | 2.11.4 |
| @tauri-apps/api | 2.11.1 |
| rustc / cargo | 1.92.0 |
| node / npm | 24.15.0 / 11.12.1 |
| JDK | OpenJDK 26.0.2 |

`wry` 0.55.1 and `tao` 0.35.3 are behind latest (0.57.0 / 0.37.0). Harmless
now — they are the desktop webview layer, not the mobile one.

## 3. Plugin support matrix

All official plugins are published and current:

| Plugin | Version | Role | Mobile |
|---|---|---|---|
| `plugin-store` | 2.4.4 | Settings persistence | iOS + Android |
| `plugin-fs` | 2.5.2 | Export/import file I/O | iOS + Android |
| `plugin-dialog` | 2.7.3 | File save/open pickers | iOS + Android |
| `plugin-clipboard-manager` | 2.3.3 | Copy/paste-JSON transport | iOS + Android |
| `plugin-os` | 2.3.2 | Platform detection | iOS + Android |
| `plugin-haptics` | 2.3.3 | Celebration feedback | **mobile only** |
| `plugin-opener` | 2.5.5 | External links | iOS + Android |

### Plugin gap: no viable share sheet

The one thing the ecosystem does not offer is a maintained share sheet.

- `tauri-plugin-sharesheet` (buildyourwebapp): **0.0.1**, single published
  version, last touched **2024-08-29**, ~1.9k recent downloads. Not on npm
  under the official scope.
- No official `@tauri-apps/plugin-sharesheet` exists.

**Decision: v1 does not use a share sheet.** Depending on a stale 0.0.1
community plugin for a data-export path — the exact feature whose job is not
losing the user's data — is a bad trade. `SPEC.md` §5 therefore specifies file
save/open plus copy/paste-as-text, both backed by official plugins. This is a
deliberate product constraint, not an oversight.

## 4. Export/import transport decision

| Path | Plugins | Status |
|---|---|---|
| Save/open a file | `dialog` + `fs` | **Chosen.** Official, both platforms. |
| Copy/paste JSON | `clipboard-manager` | **Chosen** as the always-works fallback. |
| Share sheet | community 0.0.1 | Rejected, see §3. |

**Open risk:** Tauri 2's `fs` scope model must permit the path returned by the
native picker. The scaffold pre-declares `$DOWNLOAD/**` and `$DOCUMENT/**` in
`capabilities/default.json`, but on Android and iOS the picker commonly returns
a content URI or sandboxed path outside those scopes. **If scoping fights the
picker, copy/paste-as-text is the shipping fallback** and file transport becomes
desktop-only. This is criterion G4 in §7.

## 5. Platform blockers

### 5.1 Android — solvable, just not installed

```
Info  ANDROID_HOME not set, trying to locate Android SDK...
Error Android SDK not found at /home/feoh/Android/Sdk
```

Needed: Android SDK + **NDK**, `ANDROID_HOME`/`NDK_HOME`, and four Rust
targets, none currently installed:

```
aarch64-linux-android  armv7-linux-androideabi
i686-linux-android     x86_64-linux-android
```

Ordinary setup work. `minSdkVersion` is pinned to 24 in `tauri.conf.json`.

### 5.2 iOS — macOS-only, structurally

This is stronger than "needs Xcode". The subcommand **does not exist** in the
Linux CLI build:

```
$ npx tauri ios init
error: unrecognized subcommand 'ios'
  tip: a similar subcommand exists: 'icon'
```

The iOS commands are compiled out on non-macOS hosts. No amount of local
configuration reaches an iOS build from Linux — it requires the confirmed-
available Mac. Targets `aarch64-apple-ios`, `aarch64-apple-ios-sim`,
`x86_64-apple-ios` must be installed there. `minimumSystemVersion` is pinned to
14.0.

### 5.3 CI constraints

- Android: builds on Linux runners; needs SDK/NDK provisioning plus a keystore
  in secrets.
- iOS: **requires macOS runners** — billed at a higher multiplier, and needs an
  Apple certificate, provisioning profile, and App Store Connect key installed
  into a temporary keychain. This is the most expensive and most fragile part
  of the pipeline, and it is the reason iOS is sequenced after Android.
- Both stores need signing identities that cannot be created from this host.

## 6. What hardware must still prove

Deferred purely for lack of a device — each is a release gate, not a nice-to-have:

1. **Store persistence survives cold start and app kill** on both platforms.
2. **Backup eligibility** — Android manifest `allowBackup`; iOS store file
   located in a backed-up directory and not excluded. Test by restoring to a
   second device. This is the load-bearing promise of `SPEC.md` §4 and the
   easiest thing to silently get wrong.
3. **Canvas fireworks performance** — target 60 fps, floor 30 fps sustained on
   a mid-range Android device, which is far more constrained than any desktop
   GPU result would suggest. Needs a particle-count ceiling determined *on
   device*, plus verified teardown so the canvas never animates in background.
4. **Safe areas** — notch, Dynamic Island, home indicator, and Android
   navigation bars, using `env(safe-area-inset-*)` with `viewport-fit=cover`.
5. **Haptics actually compiles and links for mobile** — gap row 6 above; it has
   never been built for a mobile target.

## 7. Go / no-go criteria

**Go for the Android + iOS Tauri 2 architecture.** Core stack, plugin coverage,
and build pipeline are all verified working; no blocker is architectural.

Proceed to implementation. These are the conditions that would reverse the
decision:

| ID | Criterion | If it fails |
|---|---|---|
| G1 | `tauri android init` + device build succeeds | **No-go for Android.** Re-evaluate stack. |
| G2 | `tauri ios init` + device build succeeds on the Mac | **No-go for iOS**; ship Android-only. |
| G3 | Store data is backup-eligible on both platforms | Fall back to making export/import the *primary*, prominently-surfaced backup path. |
| G4 | Picker-returned paths are usable under `fs` scope | Copy/paste-as-text becomes the only mobile transport; file I/O goes desktop-only. |
| G5 | Fireworks hold ≥30 fps on mid-range Android | Reduce particle ceiling; if still failing, ship the static reduced-motion illustration as the default for everyone. |
| G6 | Safe-area insets behave on notched devices | Add per-platform padding shims. |
| G7 | Haptics compiles for mobile targets | Drop haptics — it is decorative, so this alone never blocks release. |

None of G3–G7 can sink the project; each has a defined, acceptable degraded
path. Only G1 and G2 are existential, and only for their own platform.

## 8. Sequencing recommendation

1. Build the app against **desktop** first. The domain logic — date math,
   workday counting, proration — is pure TypeScript and needs no device,
   so it can be written and tested before the SDKs are in place.
2. Stand up **Android** locally (SDK + NDK + targets), then clear G1, G3–G7.
3. Add **iOS** on the Mac, clear G2, then wire macOS CI last.

This ordering deliberately puts the highest-cost, lowest-flexibility work
(iOS signing and macOS CI) after the design has stopped moving.

### Which machine does what

Worth stating plainly, because it is easy to assume mobile work implies a Mac:

| Work | Machine |
|---|---|
| App implementation, domain logic, tests | Either — pure TypeScript |
| Android SDK/NDK, `android init`, device builds (G1) | **Linux is fine.** The Android toolchain is Linux-native. |
| iOS anything (G2) | **Mac only** — see §5.2 |
| macOS CI runners | Mac/CI only |

So the Linux box stays the primary development machine and the Mac is needed
only to clear G2 and verify iOS. Only one of the seven gates is Mac-bound.
