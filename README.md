# retirement-emancipation-countdown

A local-first iOS and Android retirement countdown app built with Tauri 2.

Configure your retirement date, the weekdays you actually work, and your annual
vacation allowance. The app shows how much calendar time is left, estimates how
much _working_ time is left, rotates a daily message, and celebrates when the
day finally arrives.

No accounts, no backend, no network calls. Your settings live on your device and
travel in the platform's normal backups, with versioned export/import for
cross-platform moves.

## Documentation

| Document                                     | Contents                                                                                           |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [`docs/SPEC.md`](docs/SPEC.md)               | MVP specification: domain rules, validation, persistence, export format, accessibility, exclusions |
| [`docs/WIREFRAMES.md`](docs/WIREFRAMES.md)   | Screen-by-screen wireframes                                                                        |
| [`docs/FEASIBILITY.md`](docs/FEASIBILITY.md) | Tauri 2 mobile feasibility findings, plugin gaps, go/no-go criteria                                |
| [`docs/QA.md`](docs/QA.md)                   | Automated baseline and outstanding physical-device release gates                                   |

## Status

Desktop implementation complete; mobile delivery gates remain.

- ✅ Spec, wireframes, and feasibility go/no-go recorded
- ✅ Tauri 2 + React + TypeScript scaffold building on desktop, with CI and pre-commit checks
- ✅ Countdown, workday-counting, and vacation-proration domain logic, with multi-timezone tests
- ✅ Onboarding, dashboard, and accessible settings backed by versioned `plugin-store` persistence
- ✅ File/clipboard backup transfer with strict previewed import
- ✅ Reduced-motion-aware retirement celebration with replayable canvas fireworks
- ⬜ Android build (needs SDK + NDK — see `FEASIBILITY.md` §5.1)
- ⬜ iOS build (macOS-only — see `FEASIBILITY.md` §5.2)

## Development

Requires Rust, Node 22.12 or newer, npm 11 or newer, and the [Tauri 2
prerequisites](https://tauri.app/start/prerequisites/) for your platform.

```sh
npm install

npm run tauri dev    # run the desktop app
npm run dev          # frontend only, in a browser
npm test                 # domain logic tests
npm run typecheck        # tsc --noEmit
npm run format:check     # Prettier formatting check
npm run lint             # ESLint
npm run build            # typecheck + production frontend bundle
pre-commit run --all-files # all frontend and Rust checks
```

The domain logic in `src/domain/` is pure TypeScript with no Tauri dependency,
so the date math can be developed and tested without a device or an SDK.

Date arithmetic is local-wall-clock throughout, so it is worth running the tests
under a few timezones:

```sh
TZ=America/New_York npm test
TZ=Australia/Sydney npm test
TZ=Asia/Kolkata npm test
```

### Mobile

```sh
npm run tauri android init && npm run tauri android dev
npm run tauri ios init && npm run tauri ios dev      # macOS only
```

Both need extra toolchain setup that is not yet in place; see
[`docs/FEASIBILITY.md`](docs/FEASIBILITY.md) §5.

## License

Not yet chosen.
