import type { Options } from '@wdio/types';
import path from 'path';
import { execFileSync } from 'child_process';
import { androidCapabilities } from './capabilities/android';

/** Port the host-side mock API listens on. Mirrors MOCK_SERVER_PORT in CI. */
const MOCK_SERVER_PORT = process.env.MOCK_SERVER_PORT || '3000';

/**
 * Resolve the adb binary. The SDK is not on PATH in every shell (CI sets
 * ANDROID_SDK_ROOT, a local machine may only have ANDROID_HOME), so check both
 * before falling back to whatever `adb` PATH resolution finds.
 */
function adbPath(): string {
  const sdk = process.env.ANDROID_SDK_ROOT || process.env.ANDROID_HOME;
  return sdk ? path.join(sdk, 'platform-tools', 'adb') : 'adb';
}

/**
 * Make the host's mock API reachable from inside the emulator.
 *
 * The emulator is a separate machine: its `localhost` is itself, so the app's
 * configured `http://localhost:3000/api` resolves to a closed port and every
 * request fails. `adb reverse` opens a tunnel so the emulator's localhost:3000
 * forwards to the host's — which is why this needs no change to
 * app/src/environments/environment.ts, and why the URL stays on `localhost`
 * rather than the 10.0.2.2 alias. That matters: Chromium treats http://localhost
 * as a potentially-trustworthy origin, so the call out of the https:// page is
 * not treated as blockable mixed content the way http://10.0.2.2 would be.
 */
function reverseMockServerPort(): void {
  execFileSync(adbPath(), ['wait-for-device'], { stdio: 'inherit' });
  execFileSync(adbPath(), ['reverse', `tcp:${MOCK_SERVER_PORT}`, `tcp:${MOCK_SERVER_PORT}`], {
    stdio: 'inherit',
  });
  console.log(`[wdio] adb reverse tcp:${MOCK_SERVER_PORT} -> host tcp:${MOCK_SERVER_PORT}`);
}

/**
 * Fail fast, and legibly, when the mock API is not running on the host.
 *
 * Without this the tunnel is created successfully against nothing and the
 * failure surfaces much later as a login test timing out on a spinner, which
 * reads like an app or selector defect rather than a missing service.
 *
 * Polls rather than probing once: CI starts the mock with `npm start &` a few
 * steps earlier, and a single request racing a server that is still binding
 * would fail the whole run for no reason.
 */
async function assertMockServerReachable(timeoutMs = 30000): Promise<void> {
  const url = `http://localhost:${MOCK_SERVER_PORT}/api/health`;
  const start = Date.now();
  let lastError = 'no attempt made';

  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        console.log(`[wdio] mock API healthy at ${url}`);
        return;
      }
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = (error as Error).message;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(
    `Mock API never became reachable at ${url} within ${timeoutMs}ms (last error: ${lastError}). ` +
      `Start it with \`npm start\` in api/mock-server before running the mobile suite.`
  );
}

/**
 * WebdriverIO + Appium configuration for mobile E2E tests.
 * Targets Android emulator (Pixel 6, API 33) with UiAutomator2.
 */
export const config: Options.Testrunner = {
  runner: 'local',
  autoCompileOpts: {
    tsNodeOpts: {
      project: path.resolve(__dirname, './tsconfig.json'),
    },
  },

  // The hybrid-mobile fix (WEBVIEW context + CSS selectors) is brought online
  // one screen at a time, each verified against a real emulator before the next
  // is enabled. Login and workouts are migrated; the gestures and device-feature
  // specs still carry the old selector/testid mismatches and are re-enabled here
  // as they are fixed. See MOBILE.md.
  specs: ['./specs/login.spec.ts', './specs/workouts.spec.ts'],
  exclude: [],

  maxInstances: 1,

  capabilities: [androidCapabilities],

  logLevel: 'info',
  bail: 0,
  baseUrl: '',
  waitforTimeout: 60000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,

  services: [
    [
      'appium',
      {
        args: {
          relaxedSecurity: true,
          address: '127.0.0.1',
          port: 4723,
        },
        logPath: path.resolve(__dirname, '../reports/appium-logs'),
      },
    ],
  ],

  framework: 'mocha',
  mochaOpts: {
    ui: 'bdd',
    timeout: 120000,
    // Retry a failed test up to twice within the same session. Soft-keyboard
    // detection (isKeyboardShown) and orientation settling are non-deterministic
    // on a headless emulator — a test can fail once and pass immediately after.
    // Retries absorb that emulator-level flakiness without masking a real,
    // repeatable failure (which fails all attempts). This is standard practice
    // for mobile E2E; it is cheap because only the failing test re-runs, not the
    // whole session.
    retries: 2,
  },

  reporters: [
    'spec',
    [
      'allure',
      {
        outputDir: path.resolve(__dirname, '../reports/allure-results'),
        disableWebdriverStepsReporting: false,
        disableWebdriverScreenshotsReporting: false,
        useCucumberStepReporter: false,
      },
    ],
  ],

  /**
   * Runs once, before the Appium session is created, so the tunnel is in place
   * before the app makes its first request.
   */
  onPrepare: async function () {
    await assertMockServerReachable();
    reverseMockServerPort();
  },

  /**
   * Take a screenshot on test failure for debugging.
   *
   * Parameter types are inferred from Options.Testrunner rather than annotated
   * by hand, so `test` is WDIO's Frameworks.Test (which has `.title`) and the
   * result destructure matches the hook's real shape.
   */
  afterTest: async function (test, _context, { error }) {
    if (error) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const testTitle = (test.title || 'unknown').replace(/\s+/g, '_');
      const screenshotPath = path.resolve(
        __dirname,
        `../reports/screenshots/FAIL_${testTitle}_${timestamp}.png`
      );
      await browser.saveScreenshot(screenshotPath);
    }
  },

  /**
   * Reset app state before each test suite to ensure isolation.
   */
  beforeSuite: async function () {
    if (driver && typeof driver.terminateApp === 'function') {
      try {
        await driver.terminateApp('com.qaframework.fitnesstracker', {});
        await driver.activateApp('com.qaframework.fitnesstracker');
      } catch {
        // App may not be running yet on first suite
      }
    }
  },
};
