# Mobile QA Automation Framework

A demo-ready mobile testing prototype showcasing end-to-end QA ownership across mobile apps, APIs, and cloud-native systems.

## Architecture

```
mobileionic-qa-framework/
├── app/                          # Ionic 8 / Capacitor fitness tracker app
│   ├── src/app/pages/            # Login, Dashboard, Workouts, History, Profile
│   └── src/app/services/         # API + Auth services
├── api/
│   ├── dotnet-api/               # C# .NET 8 Web API (EF Core + SQL Server)
│   │   └── Controllers/          # Auth, Workouts, Users, Analytics
│   └── mock-server/              # JSON Server mock API for quick demos
├── tests/
│   ├── e2e-web/                  # Playwright browser tests (Page Object Model)
│   │   ├── pages/                # Page objects with data-testid selectors
│   │   ├── specs/                # Login, workouts, navigation, responsive
│   │   └── fixtures/             # Test data
│   ├── e2e-mobile/               # Appium / WebdriverIO Android tests
│   │   ├── screens/              # Screen objects (mobile POM)
│   │   ├── specs/                # Login, workouts, gestures, device features
│   │   └── capabilities/         # Device configs (local + BrowserStack)
│   ├── api/                      # Playwright API + contract tests
│   │   ├── specs/                # Auth, CRUD, analytics, schema validation
│   │   ├── schemas/              # JSON schemas (ajv)
│   │   └── helpers/              # Typed API client
│   └── performance/              # k6 load, stress, and spike tests
├── .github/workflows/            # CI/CD pipelines
│   ├── qa-pipeline.yml           # PR/push: lint → API → web → mobile → report
│   └── nightly-regression.yml    # Full regression + perf + Slack alerts
└── docs/                         # QA strategy, device matrix, defect taxonomy
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile App | Ionic 8, Capacitor, Angular 17, TypeScript |
| Backend API | C# .NET 8, Entity Framework Core, SQL Server |
| Mock Server | JSON Server with JWT auth |
| Web Testing | Playwright (Chrome, Firefox, Mobile Chrome) |
| Mobile Testing | Appium + WebdriverIO (Android / UiAutomator2) |
| API Testing | Playwright API + ajv schema validation |
| Performance | k6 (load, stress, spike) |
| Reporting | Allure Reports (screenshots, video, history) |
| CI/CD | GitHub Actions (matrix builds, Allure on GitHub Pages) |
| Containerization | Docker Compose (SQL Server + .NET API) |

## Quick Start

### 1. Start the Mock API

```bash
cd api/mock-server
npm install
npm start
# API running at http://localhost:3000
```

### 2. Start the Ionic App

```bash
cd app
npm install
ionic serve
# App running at http://localhost:8100
```

### 3. Run Tests

```bash
cd tests
npm install

# API tests (mock server must be running)
npx playwright test --project=api

# Web E2E tests (mock server + app must be running)
npx playwright test --project=web

# Same gates CI runs
npm run lint
npm run typecheck

# Generate Allure report
npx allure generate reports/allure-results --clean -o reports/allure-report
npx allure open reports/allure-report
```

The `web` project is the fast local default (mobile-sized Chromium). CI shards
across per-browser projects: `web-chromium`, `web-firefox`, `web-webkit`,
`web-mobile-chrome`, `web-mobile-safari`.

Point the suites at another environment with `BASE_URL` and `API_BASE_URL`.
The mock server must stay on port 3000 unless you also rebuild the app — the
Ionic build bakes `src/environments/environment.ts` in at compile time.

### 4. Run Mobile Tests (requires Android emulator)

```bash
cd tests/e2e-mobile
npm install
npx appium &
npx wdio run wdio.conf.ts
```

### 5. Start the Real .NET API (requires Docker)

```bash
cd api/dotnet-api
docker-compose up -d
# API running at http://localhost:5000, Swagger at http://localhost:5000/
```

## Test Credentials

| User | Email | Password |
|------|-------|----------|
| Test User | test@example.com | password123 |
| Admin | admin@example.com | password123 |
| Secondary | user2@example.com | password123 |

## Test Suites Overview

### Web E2E (36 passing, 1 skipped)
- Login: valid/invalid credentials, field validation, logout
- Workouts: list, create, edit, search/filter
- Navigation: tabs, deep links, back button
- Responsive: mobile/tablet viewports, orientation

### Mobile E2E (Appium/WebdriverIO on Android)
- Login: **proven green on API 33 + 34** — 7 passing, 5 skipped (documented)
- Workouts / Add-workout / Gestures / Device features: being migrated to the
  webview approach screen by screen (see [MOBILE.md](tests/e2e-mobile/MOBILE.md))

### API (40 passing, 1 skipped)
- Auth: login/register, token handling
- Workouts: full CRUD lifecycle, userId/date filtering, ordering
- Analytics: summary accuracy, weekly breakdown
- Contracts: ajv schema validation with format checking, passwordHash leak check

### Performance (3 profiles)
- Load: ramp to 50 users, p95 < 500ms
- Stress: ramp to 200 users, find breaking point
- Spike: burst to 100 users, measure recovery

## CI/CD Pipelines

**qa-pipeline.yml** — runs on every push/PR:
1. Lint + type check
2. API tests
3. Web E2E (Chromium / Firefox / Mobile Chrome matrix)
4. Allure report → GitHub Pages

(Mobile E2E is intentionally not in the PR pipeline — see the mobile status
below.)

**nightly-regression.yml** — runs at 2am UTC:
- Full browser matrix (5 browsers: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari)
- Performance tests (k6 load + spike)
- Mobile E2E on the Android emulator matrix (opt-in via `-f run_mobile=true`)
- Slack notification on failure (when `SLACK_WEBHOOK_URL` is set)

## Documentation

- [Test Strategy](docs/test-strategy.md) — pyramid, environments, coverage targets, quality gates
- [Device Matrix](docs/device-matrix.md) — target devices, OS versions, priority tiers
- [Defect Taxonomy](docs/defect-taxonomy.md) — severity levels, categories, bug report template

## Current Status & Known Gaps

Stating this plainly so the coverage claims above are not read as more than
they are.

| Layer | Status |
|---|---|
| Lint + type check | Green in CI |
| API + contract tests | Green in CI |
| Web E2E (Chromium, Firefox, Mobile Chrome) | Green in CI |
| Allure report generation | Green in CI |
| Mobile E2E — login (Appium/Android) | **Green on Android API 33 + 34** (opt-in nightly job) |
| Mobile E2E — other screens | Pending — being rewritten screen by screen, see [MOBILE.md](tests/e2e-mobile/MOBILE.md) |
| k6 performance | Green in CI (nightly) |

**Mobile E2E: the login screen is proven end-to-end on real emulators.** The
suite originally located elements with the accessibility-id strategy
(`$(`~login-email-input`)`), but `data-testid` is a DOM attribute inside the
Capacitor WebView, not an Android accessibility id — so in the `NATIVE_APP`
context nothing resolved and every spec timed out. `login.spec.ts` was rewritten
to the correct hybrid approach and now passes on both Android API 33 and 34:

- switch into the `WEBVIEW_*` context after launch (and re-select it after an
  app relaunch — terminating the app tears down the renderer the driver is
  attached to);
- CSS `[data-testid]` selectors against the DOM;
- type into `ion-input`'s **shadow-DOM** `<input>` (Chromedriver CSS does not
  pierce shadow DOM the way Playwright does);
- read `ion-button`'s reflected `disabled` attribute (`isEnabled()` always
  reports true for a custom element).

Seven login tests pass reliably; five are skipped with documented reasons —
three that need the mock API reachable from inside the emulator (next
iteration), and two soft-keyboard-visibility checks that a headless emulator
does not report reliably (they passed on API 34 but failed every retry on API
33). The other screens (`workouts`, `add-workout`, `gestures`,
`device-features`) still carry the old selector mismatches and are being brought
online the same way. Full detail and rationale in
[tests/e2e-mobile/MOBILE.md](tests/e2e-mobile/MOBILE.md).

The mobile job is opt-in (excluded from the PR pipeline; off by default on the
nightly) because the not-yet-migrated screens can't pass and a timed-out
emulator job is *cancelled* rather than failed, which would drag a run's
conclusion down. Run the proven login suite deliberately with:

```bash
gh workflow run "Nightly Regression" -f run_mobile=true
```

**Two known defects are documented rather than papered over:**

1. `GET /api/workouts` requires a bearer token but never scopes results to the
   caller — it returns every user's records unless an explicit `?userId=` is
   passed. `WorkoutsController.GetAll` has the same shape, so this is a service
   defect, not a mock artefact, and it is inconsistent with
   `/api/analytics/summary`, which does derive the user from the token. Covered
   by a skipped spec in `tests/api/specs/workouts.spec.ts` so the expected
   behaviour is recorded and starts enforcing the moment it is fixed.
2. The workout list has no delete affordance. The spec for it is skipped with a
   comment rather than deleted, and the page object method is kept ready.

## Key Framework Design Decisions

- **Page Object Model** for web, **Screen Object Model** for mobile — separates test logic from UI selectors
- **data-testid attributes** on all interactive elements — resilient to CSS/layout changes
- **Dual backend** (mock + real) — mock for fast demos, .NET API for depth
- **Contract testing** with ajv — ensures API responses match expected schemas
- **Allure reporting** — rich HTML reports with screenshots on failure and video on retry
- **Matrix CI** — parallel browser/device testing for coverage without serial bottlenecks
- **The mock mirrors the real API rather than being convenient** — it assigns
  `id`/`createdAt` server-side and merges on `PUT` because the .NET controller
  does, and it deliberately reproduces the unscoped list endpoint. A mock that
  is stricter than the service it stands in for hides defects instead of
  catching them.
- **In-memory fixtures** — the mock loads `db.json` into memory and never writes
  back, so every run starts from the same known-good state. Persisting
  mutations meant one run's `PUT` corrupted the next run's baseline.
- **Tests own their data** — specs create the records they assert on and clean
  up afterwards. Asserting over shared mutable state races other specs under
  `fullyParallel` and produces failures that look like product bugs.
