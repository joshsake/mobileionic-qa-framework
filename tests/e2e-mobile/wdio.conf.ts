import type { Options } from '@wdio/types';
import path from 'path';
import { androidCapabilities } from './capabilities/android';

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

  // Scoped to login for now. The hybrid-mobile fix (WEBVIEW context + CSS
  // selectors) is being brought online one screen at a time so each is verified
  // against a real emulator in CI before the next is enabled — the workouts,
  // gestures and device-feature specs still carry the old selector/testid
  // mismatches and are re-enabled here as they are fixed. See MOBILE.md.
  specs: ['./specs/login.spec.ts'],
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
