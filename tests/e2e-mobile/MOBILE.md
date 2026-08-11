# Mobile E2E (Appium + WebdriverIO) — status and approach

The app under test is an **Ionic/Capacitor hybrid**: the UI is a web page
running inside an Android `WebView`, not native widgets. Every design choice in
this suite follows from that.

## Why the suite was rewritten

The original screen objects located elements with the accessibility-id strategy:

```ts
$(`~login-email-input`)   // ~ = accessibility id
```

`data-testid` is a DOM attribute. In the default `NATIVE_APP` context
UiAutomator2 sees the native view tree and cannot resolve it, so **every spec
timed out** — the job burned ~45 min per run to reach a guaranteed failure and,
because a timed-out job is *cancelled* rather than *failed*, it dragged the
whole run's conclusion down with it.

The fix is standard hybrid automation:

1. **Switch into the WebView context** after launch (`BaseScreen.switchToWebview`
   polls `getContexts()` for `WEBVIEW_*`).
2. **Locate with CSS** `[data-testid="..."]` against the DOM.
3. **Reach shadow DOM explicitly.** Ionic renders the native `<input>` inside
   `ion-input`'s open shadow root. Chromedriver CSS does not pierce shadow DOM
   the way Playwright does, so typing goes through `element.shadow$('input')`.
   Note this is per-component: `ion-alert` (which `ion-select` opens) uses
   *scoped* styles, not shadow DOM, so plain CSS reaches inside it.
4. **Read reflected attributes, not `isEnabled()`.** WebDriver's "is enabled"
   only reports false for native form controls; `ion-button` always reports
   enabled, so the disabled state is read from the reflected `disabled`
   attribute.
5. **Device actions stay at the driver level.** Keyboard, orientation, back
   button and coordinate gestures are driver commands that work across the
   context boundary and are called directly from the specs.

## Reaching the mock API from the emulator

The suite originally could not drive a real login at all: the app's WebView
calls the mock API over the network, and a host-side mock is not reachable from
inside an emulator by default. Three independent things had to be fixed, and
getting any one wrong fails the request silently from the test's point of view —
the UI just sits on a spinner.

**1. The emulator's `localhost` is the emulator.** `wdio.conf.ts` runs
`adb reverse tcp:3000 tcp:3000` in `onPrepare`, tunnelling the emulator's
port 3000 to the host's. The alternative — rewriting the app's API base URL to
the `10.0.2.2` host alias — was rejected for two reasons: it would mean the app
under test is not built the way it ships, and `http://10.0.2.2` is not a
trustworthy origin, so it runs headlong into problem 3 below. Keeping the URL on
`localhost` means `app/src/environments/environment.ts` needs no change at all.

**2. CORS rejected the WebView's origin.** On Android, Capacitor serves the app
from `https://localhost` — no port. The mock allowed
`/^http:\/\/localhost:\d+$/`, which rejects that on both the scheme and the
mandatory port, so every request failed preflight before reaching a route. The
allowlist in `api/mock-server/server.js` now covers the Capacitor origins
(`capacitor://localhost` included, ready for an iOS suite).

**3. The page is `https://` and the API is `http://`.** That is mixed content,
and Android additionally blocks cleartext HTTP by default from API 28 on. The
E2E build opts into both via `app/capacitor.config.ts`, gated behind
`MOBILE_E2E=1` so a normal `npm run build` still produces the hardened default —
these flags genuinely weaken the app and do not belong in the shipping config.
`androidScheme` deliberately stays `https`: downgrading it to `http` would
sidestep mixed content but change the app's origin, and with it its storage
partition and secure-context status, away from what ships.

Because the tunnel is set up by the wdio config rather than the workflow, the
same command works locally and in CI. `onPrepare` also polls `/api/health`
first and fails with an explicit message if the mock is not running — otherwise
the tunnel is created successfully against nothing and the failure surfaces much
later as a login timeout, which reads like a selector defect.

## Rollout — one screen at a time, verified against a real emulator

`wdio.conf.ts` scopes `specs` to the screens that have been migrated; the rest
keep the old selector/testid mismatches until fixed.

| Spec | State | Notes |
|------|-------|-------|
| `login.spec.ts` | **migrated** | 11 passing, 2 skipped (soft-keyboard visibility) |
| `workouts.spec.ts` | **migrated** | 12 passing, 4 skipped (3 unimplemented features + 1 open defect) |
| `gestures.spec.ts` | pending | pinch/drag/long-press coordinate math on the hybrid surface |
| `device-features.spec.ts` | pending | orientation/back/backgrounding |

Mobile E2E is inherently flaky on headless emulators, so `mochaOpts.retries` is
set to 2 — a genuinely broken test still fails every attempt, but a one-off
emulator hiccup (orientation settling, a slow relaunch) does not fail the run.

### What login proves

The passing login tests exercise the full hybrid bridge on a real device:
WEBVIEW context switching (and re-selecting it after an app relaunch), CSS
`[data-testid]` resolution in the webview, typing into `ion-input`'s shadow-DOM
`<input>`, reading `ion-button`'s reflected `disabled` attribute, the native
biometric stub, orientation changes — and, since the tunnel landed, real
authenticated round trips: a successful login reaching the dashboard, a 401
surfacing an error message, and the dashboard's workout tile rendering data that
came back from `GET /api/workouts`.

That last one is deliberately a separate test. "The login card went away" is
also true of a blank screen or a torn-down renderer, so the suite asserts it
*arrived* somewhere and that real data followed.

### What workouts proves

List rendering from the API, client-side search filtering (including the empty
state), the full add-workout flow through `ion-select`'s alert overlay, the
submit button's reflected disabled state, cancel discarding the entry, scrolling,
and back-navigation to the dashboard.

Two things about `workouts.spec.ts` are worth knowing, because neither was a
selector problem:

- Its previous version logged in with `testuser@example.com` / `Test1234!`,
  credentials that exist in no fixture. It would have failed at the login step
  even with perfect selectors.
- Its `add-workout` screen object was written against testids the page never
  had — `submit-workout-btn` for `add-workout-submit-btn`,
  `exercise-type-picker` for `add-workout-exercise-select`, and so on — and
  assumed an inline picker with `exercise-option-*` testids. The real component
  is an `ion-select`, which opens an `ion-alert` overlay whose options carry no
  testids and whose selection is not committed until OK is tapped.

The list also shows all 15 seeded workouts rather than the 5 belonging to the
logged-in user, because `GET /api/workouts` is not scoped to the bearer token.
That is known defect #1; the spec asserts the current behaviour so the
expectation changes visibly when the defect is fixed.

### Defect #3, found by this migration

**Adding a workout does not update the list.** The record is saved, and the
user is returned to a list that does not contain it. It appears only after
navigating into the page afresh.

`WorkoutsPage` loads its data in `ngOnInit`. Returning from `/workouts/add` pops
back to the view Ionic's router outlet already holds in its navigation stack, so
the component is never re-created and `ngOnInit` never runs a second time.
`ngOnInit` is only correct for a page loaded once; the hook that fires on every
entry is `ionViewWillEnter`.

The specs are deliberately split so this could be proved rather than guessed:
`should persist a workout submitted with all fields` reads the API directly and
passes — the POST lands — while `should show a newly added workout in the list`
asserts the same record is on screen, and is skipped because it is not. Testing
only the UI would have reported this as a failed save, and testing only the API
would have missed it completely.

The same split is why the cancel spec checks the API too: while this defect is
open, a stale list would make "the workout is not shown" pass even if cancel had
wrongly saved it.

### Skipped tests, and why

**Soft-keyboard visibility (2, in `login.spec.ts`).**
`should show the keyboard when tapping the email input` and `should keep the
keyboard up when moving focus…` assert `driver.isKeyboardShown() === true`,
which is not reliably reported on a headless (`-no-window`) emulator — with
retries on, the suite passed in full on API 34 but these two failed *all three
attempts* on API 33. That split is the evidence it is environmental, not a
defect. Keyboard *interaction* (typing) stays covered by the button-disable and
"dismiss keyboard" tests.

**An open defect (1, in `workouts.spec.ts`).** `should show a newly added
workout in the list` — defect #3 above. Skipped with the correct expectation
recorded rather than rewritten to assert the broken behaviour, so it starts
enforcing the moment the lifecycle hook is fixed.

**App features that do not exist (3, in `workouts.spec.ts`).** These are kept
and skipped rather than deleted, the same treatment the known defects get in the
web and API suites, so they start enforcing the day the feature lands:

- *swipe to delete* — known defect #2: the rows are plain `ion-item`s with no
  `ion-item-sliding` wrapper, so a left swipe reveals nothing.
  `WorkoutsScreen.swipeToDelete` is kept ready to drive it.
- *pull to refresh* — `workouts.page.ts` renders no `ion-refresher`.
- *offline indicator* — no such element exists. The page's error handler falls
  back to an empty list, so a user offline sees an empty state indistinguishable
  from having no workouts. Worth its own defect report.

## Running it

CI runs this on the nightly schedule, and on manual runs unless unticked:

```bash
gh workflow run "Nightly Regression" -f run_mobile=false   # to skip it
```

Locally you need a booted Android emulator, the mock server, and the E2E build
of the app. From the repo root:

```bash
# 1. mock API on the host
(cd api/mock-server && npm ci && npm start &)

# 2. build the app with the E2E transport flags and install it
cd app && npm ci && MOBILE_E2E=1 npm run build
MOBILE_E2E=1 npx cap sync android
(cd android && ./gradlew assembleDebug)

# 3. run the suite (wdio sets up the adb tunnel itself)
cd ../tests/e2e-mobile && npm ci
npx tsc --noEmit -p tsconfig.json   # type gate for the whole suite
npm test
```

`npm test` resolves the local wdio binary from `node_modules/.bin`; `npx wdio`
from the wrong directory silently fetches the deprecated `wdio@6` scaffolder
instead and hangs.
