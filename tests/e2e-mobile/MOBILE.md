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
4. **Read reflected attributes, not `isEnabled()`.** WebDriver's "is enabled"
   only reports false for native form controls; `ion-button` always reports
   enabled, so the disabled state is read from the reflected `disabled`
   attribute.
5. **Device actions stay at the driver level.** Keyboard, orientation, back
   button and coordinate gestures are driver commands that work across the
   context boundary and are called directly from the specs.

## Rollout — one screen at a time, verified in CI

Local machines here have no Android emulator, and each CI emulator run is
~45 min, so the suite is being re-enabled incrementally rather than rewritten
blind. `wdio.conf.ts` scopes `specs` to the screens that have been proven
against a real emulator; the rest keep the old selector/testid mismatches and
are switched on as they are fixed.

| Spec | State | Notes |
|------|-------|-------|
| `login.spec.ts` | **active** | webview context + CSS + shadow DOM + native keyboard/orientation |
| `workouts.spec.ts` | pending | screen has testid mismatches + native-gesture concerns |
| `add-workout.spec.ts` (screen) | pending | selectors don't match the app (`submit-workout-btn` vs `add-workout-submit-btn`); ion-select overlay handling |
| `gestures.spec.ts` | pending | pinch/drag/long-press coordinate math on the hybrid surface |
| `device-features.spec.ts` | pending | orientation/back/backgrounding |

### Deferred: reaching the mock API from the emulator

Three `login.spec.ts` tests that perform a real login are `it.skip`ped. Getting
the app's WebView to the host-side mock server needs its own plumbing and is the
next iteration:

- The emulator's `localhost` is the emulator, not the host — needs
  `adb reverse tcp:3000 tcp:3000` or `10.0.2.2`.
- Capacitor serves the app over `https://localhost` (`androidScheme: 'https'`),
  so an `http://…` API call is **mixed content** and is blocked — the mock
  needs TLS, or the scheme/security-config has to allow it.
- Cleartext HTTP is disabled by default on modern Android.

The skipped tests already use the mock's real credentials
(`test@example.com` / `password123`) so they pass once the transport is wired.

## Running it

CI (opt-in — it is excluded from the PR pipeline and off by default on the
nightly, because it cannot fully pass until the networking above lands):

```bash
gh workflow run "Nightly Regression" -f run_mobile=true
```

Locally, boot an Android emulator first, then:

```bash
cd tests/e2e-mobile
npm ci
npx tsc --noEmit -p tsconfig.json   # type gate for the whole suite
npx wdio run ./wdio.conf.ts
```
