# Mobile QA Automation Framework

[![QA Pipeline](https://github.com/joshsake/mobileionic-qa-framework/actions/workflows/qa-pipeline.yml/badge.svg)](https://github.com/joshsake/mobileionic-qa-framework/actions/workflows/qa-pipeline.yml)
[![Nightly Regression](https://github.com/joshsake/mobileionic-qa-framework/actions/workflows/nightly-regression.yml/badge.svg)](https://github.com/joshsake/mobileionic-qa-framework/actions/workflows/nightly-regression.yml)

📊 **[Live test report](https://joshsake.github.io/mobileionic-qa-framework/qa-report/)** — Allure output from the latest run on `main`, published automatically by the pipeline.

End-to-end QA ownership across a hybrid mobile app, its APIs, and CI — built to
be run, not just read.

**What is actually verified, in CI, right now:**

| | |
|---|---|
| **Unit** | 94 passing — services, page logic and the lazy route table, at ~98% line and 100% branch coverage, enforced |
| **Web E2E** | 36 passing across 5 engines — Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari |
| **API + contract** | 40 passing — CRUD, auth, JSON-schema contract enforcement (ajv) |
| **Accessibility** | axe-core over every route, WCAG 2.1 A/AA, gated against a documented baseline |
| **Mobile E2E** | 23 passing on real Android emulators — login and workouts, driving the Capacitor WebView against a live API |
| **Performance** | k6 load / stress / spike, thresholds enforced |
| **Quality gates** | ESLint + TypeScript strict, run before anything else |

Seven real defects found by this suite are [documented, not hidden](#current-status--known-gaps),
and the tests that cover them are committed as skipped specs so they start
enforcing the moment the defects are fixed. The most interesting one sat in the
gap *between* layers that were each individually green — see defect #7.

The hybrid-mobile work is the deep end: Capacitor renders the UI in a WebView,
so `data-testid` is a DOM attribute the native automation driver cannot see.
Getting that suite green meant WEBVIEW context switching (and recovering it
after an app relaunch tears the renderer down), CSS selectors against the DOM,
typing into Ionic's shadow-DOM inputs, and then getting the WebView to reach a
host-side API at all — an emulator's `localhost` is the emulator, and Capacitor
serves the app over `https://` from an origin the mock's CORS rejected. Written
up in [tests/e2e-mobile/MOBILE.md](tests/e2e-mobile/MOBILE.md).

## Architecture

```
mobileionic-qa-framework/
├── app/                          # Ionic 8 / Capacitor fitness tracker app
│   ├── src/app/pages/            # Login, Dashboard, Workouts, History, Profile
│   ├── src/app/services/         # API + Auth services
│   └── src/**/*.spec.ts          # Jasmine/Karma unit tests (co-located)
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
│   ├── a11y/                     # axe-core accessibility tests
│   │   ├── specs/                # Per-route WCAG 2.1 A/AA audits
│   │   └── known-violations.ts   # Documented baseline, with impact + fix
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

Unit tests need neither the app nor the mock server running — they are the only
layer that does not:

```bash
cd app && npm run test:ci
```

```bash
cd tests
npm install

# API tests (mock server must be running)
npx playwright test --project=api

# Web E2E tests (mock server + app must be running)
npx playwright test --project=web

# Accessibility (mock server + app must be running)
npx playwright test --project=a11y --project=a11y-mobile

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

### 4. Run Mobile Tests (requires a booted Android emulator)

The mock server must be running on the host first — the suite tunnels to it with
`adb reverse` and fails fast with an explicit message if it is not up. The app
has to be built with `MOBILE_E2E=1`, which is what relaxes the WebView's
transport rules enough to reach an `http://` API from an `https://` page.

```bash
cd app && MOBILE_E2E=1 npm run build && MOBILE_E2E=1 npx cap sync android
```

```bash
cd app/android && ./gradlew assembleDebug
```

```bash
cd tests/e2e-mobile && npm ci && npm test
```

Use `npm test`, not `npx wdio` — npx from the wrong directory silently fetches
the deprecated `wdio@6` scaffolder and hangs. See
[MOBILE.md](tests/e2e-mobile/MOBILE.md) for why each step is needed.

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

### Unit (94 passing)
- Services: `AuthService` token lifecycle, `ApiService` URLs, payloads and the
  bearer-header path, driven through `HttpTestingController`
- Page logic: streak and weekly aggregation, workout search, date-range
  filtering, form validation guards, and every error-fallback branch — including
  the ones the running mock can never produce, so no E2E test can reach them
- Routes: every lazy `loadComponent` is resolved, catching a broken import that
  would otherwise only fail when a user navigates there

### Accessibility (axe-core, WCAG 2.1 A/AA)
- Every route, on desktop and mobile viewports
- Asserts no violation outside a documented baseline, plus a spec that fails if
  a baselined violation stops reproducing, so the list cannot rot
- Three real defects recorded with impact and fix in
  [tests/a11y/known-violations.ts](tests/a11y/known-violations.ts)

### Web E2E (36 passing, 1 skipped)
- Login: valid/invalid credentials, field validation, logout
- Workouts: list, create, edit, search/filter
- Navigation: tabs, deep links, back button
- Responsive: mobile/tablet viewports, orientation

### Mobile E2E (Appium/WebdriverIO on Android)
- Login: 11 passing, 2 skipped — including real authenticated round trips to the
  API from inside the emulator
- Workouts: 12 passing, 4 skipped — list rendering, search, the full
  add-workout flow through `ion-select`'s alert overlay, and navigation
- Gestures / Device features: being migrated to the webview approach screen by
  screen (see [MOBILE.md](tests/e2e-mobile/MOBILE.md))

### API (40 passing, 2 skipped)
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
2. Unit tests (Angular), with the coverage threshold enforced
3. API tests
4. Web E2E (Chromium / Firefox / Mobile Chrome matrix)
5. Accessibility (axe-core, desktop + mobile viewport)
6. Allure report → GitHub Pages

(Mobile E2E is intentionally not in the PR pipeline — see the mobile status
below.)

**nightly-regression.yml** — runs at 2am UTC:
- Full browser matrix (5 browsers: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari)
- Performance tests (k6 load + spike)
- Mobile E2E on the Android emulator matrix (API 33 + 34); skip a manual run
  with `-f run_mobile=false`
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
| Unit (Angular) | Green in CI, 80% coverage gate enforced |
| Unit (.NET API) | **Not built** — `api/dotnet-api` has no test project |
| Accessibility (axe-core) | Green in CI against a documented baseline |
| API + contract tests | Green in CI |
| Web E2E (Chromium, Firefox, Mobile Chrome) | Green in CI |
| Allure report generation | Green in CI |
| Mobile E2E — login + workouts (Appium/Android) | **Green on real emulators**, runs on the nightly |
| Mobile E2E — gestures, device features | Pending — being rewritten screen by screen, see [MOBILE.md](tests/e2e-mobile/MOBILE.md) |
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

**The app now talks to a real API from inside the emulator.** The login tests
that needed a backend were previously skipped, because a host-side mock is not
reachable from an emulator by default. Three independent things had to be fixed,
and each one fails the request silently — the UI just sits on a spinner:

- **the emulator's `localhost` is the emulator.** `adb reverse tcp:3000` tunnels
  it to the host, which keeps the app's URL on `localhost` and so needs no
  change to `environment.ts`. The `10.0.2.2` host alias was rejected: it would
  mean testing an app built differently from the one that ships, and it is not a
  trustworthy origin, which walks straight into the next problem;
- **CORS rejected the WebView's origin.** Capacitor serves the app from
  `https://localhost` — no port — and the mock's allowlist required
  `http://` *and* a port, so every request failed preflight before reaching a
  route;
- **the page is `https://` and the API is `http://`.** That is mixed content,
  and Android blocks cleartext by default from API 28 on. The E2E build opts
  into both, gated behind `MOBILE_E2E=1` so a normal build stays hardened.

Two login tests remain skipped: soft-keyboard-visibility checks that a headless
emulator does not report reliably (they passed on API 34 but failed every retry
on API 33). `workouts.spec.ts` has since been migrated the same way;
`gestures` and `device-features` still carry the old selector mismatches. Full
detail and rationale in [tests/e2e-mobile/MOBILE.md](tests/e2e-mobile/MOBILE.md).

The mobile job now runs on the nightly schedule rather than by request. It stays
out of the PR pipeline, and keeps `continue-on-error` for now, because an
emulator job that exceeds its timeout is *cancelled* rather than failed, which
would drag a run's conclusion down regardless. Skip it on a manual run with:

```bash
gh workflow run "Nightly Regression" -f run_mobile=false
```

**Three known defects are documented rather than papered over:**

1. `GET /api/workouts` requires a bearer token but never scopes results to the
   caller — it returns every user's records unless an explicit `?userId=` is
   passed. `WorkoutsController.GetAll` has the same shape, so this is a service
   defect, not a mock artefact, and it is inconsistent with
   `/api/analytics/summary`, which does derive the user from the token. Covered
   by a skipped spec in `tests/api/specs/workouts.spec.ts` so the expected
   behaviour is recorded and starts enforcing the moment it is fixed.
2. The workout list has no delete affordance. The spec for it is skipped with a
   comment rather than deleted, and the page object method is kept ready.
3. **Adding a workout does not update the list** — found by the mobile
   migration. The record saves, and the user is returned to a list that does not
   contain it; it appears only on a fresh entry into the page. `WorkoutsPage`
   loads in `ngOnInit`, but returning from `/workouts/add` pops back to a view
   Ionic's router outlet already has cached, so the component is never
   re-created and `ngOnInit` never runs again (`ionViewWillEnter` is the hook
   that fires on every entry). The mobile specs assert the API write and the UI
   render separately, which is how the two were told apart: the save is proven
   to land, and only the render is skipped.

   Verified on Android. The web suite does not currently contradict or confirm
   it — `should create a new workout when the form is filled and submitted`
   stops at the redirect to `/workouts` and never inspects the list, so it has
   the same blind spot the mobile suite had before the assertions were split.
   Checking it there is the obvious next step.
4. **Pinch-zoom is disabled app-wide.** `app/src/index.html` carries the Ionic
   starter's `maximum-scale=1.0, user-scalable=no`, which fails WCAG 2.1 SC
   1.4.4 on every route and blocks anyone who relies on zoom. Highest-impact of
   the three accessibility findings, and the smallest fix.
5. **Icon-only buttons have no accessible name.** The logout button and the
   add-workout FAB are a bare `<ion-icon>` inside a button, so a screen reader
   announces only "button". The FAB is the only way to add a workout, which
   makes the primary action unusable non-visually.
6. **Icons are exposed to assistive tech without alternative text.** Ionic
   renders `<ion-icon>` with `role="img"` and adds no label; the decorative ones
   need `aria-hidden="true"`.

   Defects 4-6 were found by the axe-core pass. Each is recorded with its impact
   and fix in [tests/a11y/known-violations.ts](tests/a11y/known-violations.ts),
   with the correct behaviour committed as a skipped spec.
7. **The app writes a date its own API contract rejects.** The add-workout form
   binds `<ion-input type="date">`, which yields `YYYY-MM-DD`. The API stores it
   verbatim, so `GET /api/workouts` then returns a record whose `date` violates
   the workout schema's `format: 'date-time'`.

   This one is worth dwelling on, because the reason it survived this long is
   the interesting part: **no fixture in the repo used the format the real app
   produces.** The contract suite builds its own workouts with
   `new Date().toISOString()` and every seeded record in `db.json` is a full ISO
   timestamp, so the schema was being validated against a shape the application
   never generates. The E2E suites drive the real form but never check the
   response body. Each layer was individually green and the gap sat between
   them — it only surfaced once the mobile suite started creating workouts
   through the UI against a server the contract tests also ran against.

   Recorded as a skipped spec in `tests/api/specs/contract.spec.ts`. The fix is
   a decision rather than a typo — either the app sends a full timestamp, or the
   schema accepts a date-only string — so the expectation is left asserting the
   contract as written rather than being relaxed to match the bug.

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
