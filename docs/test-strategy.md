# Test Strategy — Fitness Tracker Mobile QA Framework

## 1. Overview

This document defines the test strategy for the Fitness Tracker application, an Ionic/Capacitor hybrid mobile app backed by a .NET API. The strategy covers all layers of the test pyramid, automation approach, environment management, coverage targets, and release quality gates.

## 2. Test Pyramid

The framework follows a layered test pyramid to balance speed, cost, and confidence.

### Layer 1: Unit Tests (Base)
- **Scope**: Individual functions, services, and components in isolation.
- **Tools**: Jasmine/Karma (Angular), xUnit (.NET API).
- **Ownership**: Development team.
- **Execution**: On every commit, pre-push hook.
- **Target coverage**: 80% line coverage for business logic, 60% for UI components.

### Layer 2: Integration Tests
- **Scope**: Interactions between services, database queries, middleware pipelines.
- **Tools**: xUnit with in-memory database (Entity Framework), Angular TestBed for service integration.
- **Execution**: On every pull request.
- **Target coverage**: All controller endpoints, all service-to-repository paths.

### Layer 3: API Tests
- **Scope**: HTTP contract validation, authentication flows, error handling, data integrity.
- **Tools**: Playwright API testing (request context), running against the mock server or staging API.
- **Execution**: On every pull request, nightly against staging.
- **Target coverage**: 100% of documented API endpoints, all status codes per endpoint.

### Layer 4: E2E Web Tests
- **Scope**: Full user journeys through the browser-rendered Ionic app.
- **Tools**: Playwright with Chromium, Firefox, and WebKit.
- **Execution**: On every pull request (Chromium only), nightly (all browsers including mobile viewports).
- **Target coverage**: All critical user flows (login, CRUD workouts, navigation).

### Layer 5: E2E Mobile Tests (Top)
- **Scope**: Native mobile behavior including gestures, orientation, device features, app lifecycle.
- **Tools**: WebdriverIO + Appium with UiAutomator2 (Android). BrowserStack for cloud device farm.
- **Execution**: On every pull request (single emulator), nightly (device matrix).
- **Target coverage**: All critical flows on Android, gesture interactions, device-specific behaviors.

### Performance Tests (Cross-cutting)
- **Scope**: API response times under load, stress limits, spike resilience.
- **Tools**: k6.
- **Execution**: Nightly only (to avoid CI slowdown on PRs).
- **Targets**: p95 < 500ms under normal load, error rate < 1%.

## 3. Test Environments

| Environment | Purpose | Data | API Target |
|-------------|---------|------|------------|
| **Local** | Developer workstation testing | Mock server with seeded data | `localhost:5000` |
| **CI** | Automated pipeline validation | Mock server, ephemeral | GitHub Actions runners |
| **Staging** | Pre-release validation | Seeded staging database | Staging API endpoint |
| **BrowserStack** | Cloud device farm for extended device coverage | Mock server or staging | Configurable |

### Environment Parity
- Mock server responses mirror the real API contract (same JSON shapes, status codes, headers).
- Staging environment uses the same Docker image as production with a separate database.
- CI tests run against the mock server to ensure deterministic results and fast feedback.

## 4. Automation Approach and Framework Selection Rationale

### Why Playwright for Web and API?
- Single tool for both API and browser testing reduces toolchain complexity.
- Built-in auto-wait eliminates flaky explicit waits.
- Native multi-browser support (Chromium, Firefox, WebKit) from a single test suite.
- Mobile viewport emulation covers responsive layouts without real devices.
- Allure reporter integration provides unified reporting.

### Why WebdriverIO + Appium for Mobile?
- Appium is the industry standard for cross-platform mobile automation.
- UiAutomator2 provides reliable Android automation with accessibility ID support.
- WebdriverIO offers a modern, TypeScript-first API with strong community support.
- The same Page Object pattern (Screen Objects) used in web tests ensures consistency.
- BrowserStack integration provides access to real devices without infrastructure management.

### Why k6 for Performance?
- Developer-friendly JavaScript scripting aligns with the team's skill set.
- Built-in thresholds and checks enable pass/fail gates in CI.
- Low resource footprint allows running on standard CI runners.
- Cloud execution option (k6 Cloud) available for distributed load generation.

## 5. Coverage Targets by Layer

| Layer | Metric | Target | Measurement |
|-------|--------|--------|-------------|
| Unit | Line coverage | 80% | Karma/xUnit coverage reports |
| Integration | Endpoint coverage | 100% of controllers | Manual tracking |
| API | Endpoint + status code coverage | 100% | Playwright report |
| E2E Web | Critical user flow coverage | 100% of P1 flows | Test case mapping |
| E2E Mobile | Critical flow + gesture coverage | 100% of P1 flows, 80% of P2 | Test case mapping |
| Performance | Threshold compliance | p95 < 500ms, errors < 1% | k6 summary |

## 6. Defect Management Workflow

1. **Discovery**: Automated tests fail in CI or nightly regression, or manual exploratory testing finds an issue.
2. **Triage**: QA lead reviews within 4 hours of nightly failure notification. Assigns severity (S1-S4) and priority.
3. **Assignment**: Development team picks up based on priority. S1 issues block the release.
4. **Verification**: QA re-runs the relevant test suite after the fix is merged. Automated regression confirms no regressions.
5. **Closure**: Issue is closed when the fix passes all test layers and is deployed to staging.

### Severity Definitions
- **S1 - Critical**: Application crash, data loss, security vulnerability, complete feature failure.
- **S2 - Major**: Feature partially broken, significant UX degradation, performance regression > 2x baseline.
- **S3 - Minor**: Cosmetic issues, minor UX inconsistency, edge case failures.
- **S4 - Trivial**: Typos, minor alignment issues, documentation gaps.

## 7. Release Quality Gates

A release candidate must pass all of the following gates:

| Gate | Criteria | Blocking? |
|------|----------|-----------|
| Unit tests | 100% pass, coverage >= 80% | Yes |
| API tests | 100% pass | Yes |
| E2E web (Chromium) | 100% pass | Yes |
| E2E web (Firefox, WebKit) | >= 95% pass | Yes |
| E2E mobile (Android primary device) | 100% pass | Yes |
| E2E mobile (device matrix) | >= 90% pass | No (tracked) |
| Performance (load test) | p95 < 500ms, errors < 1% | Yes |
| Performance (stress test) | No crash at 2x normal load | No (tracked) |
| No open S1 defects | Zero S1 issues | Yes |
| No open S2 defects | Zero S2 issues or documented exceptions | Yes |

## 8. Mobile-Specific Testing Considerations

### Device and OS Coverage
- Primary devices: Pixel 6 (Android 13), Samsung Galaxy S23 (Android 13).
- Secondary devices: Pixel 7/8 (Android 14), Samsung Galaxy S24 (Android 14).
- See `device-matrix.md` for the full compatibility matrix.

### Network Conditions
- Tests should verify behavior under degraded network: slow 3G, offline mode, network transitions (WiFi to cellular).
- The Appium test suite includes offline mode indicator checks.
- k6 tests measure API performance which indirectly validates server-side behavior under constrained clients.

### Gesture Testing
- Swipe navigation, pull-to-refresh, swipe-to-delete, pinch-to-zoom, long press, drag-to-reorder.
- All gesture tests are in `gestures.spec.ts` and exercise the BaseScreen helper methods.

### App Lifecycle
- Background/foreground transitions, app termination and restart, screen lock/unlock.
- Covered in `device-features.spec.ts`.

### Orientation
- All critical flows tested in both portrait and landscape.
- Orientation change during mid-flow (e.g., during login) is specifically tested.

### Accessibility
- Accessibility IDs are used as primary selectors in mobile tests, ensuring the app maintains accessibility attributes.
- Future: integrate axe-core or Accessibility Scanner for automated a11y audits.

## 9. Risk-Based Testing Approach

### Risk Assessment Matrix

| Risk Area | Likelihood | Impact | Mitigation |
|-----------|-----------|--------|------------|
| Login/auth failure | Medium | Critical | API + E2E + mobile tests on every PR |
| Data loss on workout CRUD | Low | Critical | API tests with rollback verification |
| UI rendering on different devices | High | Major | Browser matrix + device matrix |
| Performance degradation | Medium | Major | Nightly load/stress tests with thresholds |
| Gesture handling inconsistency | Medium | Minor | Dedicated gesture test suite |
| Network error handling | High | Major | Offline mode tests, API error tests |
| App crash on orientation change | Low | Major | Orientation tests in device-features suite |
| Security token expiration | Low | Critical | API tests for expired/invalid tokens |

### Test Prioritization
- P1 (every PR): Login, CRUD operations, critical navigation paths.
- P2 (nightly): Full device matrix, all gesture combinations, performance.
- P3 (weekly/release): Exploratory testing, accessibility audit, security scan.
