/**
 * Playwright configuration for the Fitness Tracker test suite.
 *
 * Two projects are defined:
 *   - "web"  — E2E tests against the Ionic dev server on localhost:8100
 *   - "api"  — API contract/integration tests against the mock server on localhost:3000
 *
 * Allure reporter is configured for rich test reporting.
 * Screenshots are captured on failure; video is recorded on first retry
 * to help debug flaky mobile-style tests.
 */

import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  /* Base test directory */
  testDir: '.',

  /* Maximum time one test can run — generous for mobile-style rendering */
  timeout: 60_000,

  /* Assertion timeout */
  expect: {
    timeout: 10_000,
  },

  /* Retry flaky mobile tests up to 3 times */
  retries: 3,

  /* Run tests in parallel across files */
  fullyParallel: true,

  /* Limit workers in CI to avoid resource contention */
  workers: process.env.CI ? 2 : undefined,

  /* Fail the build on test.only in CI */
  forbidOnly: !!process.env.CI,

  /* Reporter configuration — Allure + HTML + console */
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/html-report', open: 'never' }],
    ['allure-playwright', { outputFolder: 'reports/allure-results' }],
  ],

  /* Shared settings across all projects */
  use: {
    /* Capture screenshot only when a test fails */
    screenshot: 'only-on-failure',

    /* Record video on first retry to help debug intermittent failures */
    video: 'on-first-retry',

    /* Collect trace on first retry for Playwright Trace Viewer */
    trace: 'on-first-retry',

    /* Default action timeout */
    actionTimeout: 15_000,

    /* Default navigation timeout */
    navigationTimeout: 30_000,
  },

  projects: [
    /* ── Web E2E Tests ────────────────────────────────────────────────── */
    {
      name: 'web',
      testDir: './e2e-web/specs',
      use: {
        /* Ionic dev server */
        baseURL: process.env.WEB_BASE_URL || 'http://localhost:8100',

        /* Mobile viewport to match Ionic's primary target */
        ...devices['Pixel 5'],

        /* Enable touch events for mobile gesture testing */
        hasTouch: true,

        /* Emulate mobile user agent */
        userAgent: devices['Pixel 5'].userAgent,
      },
    },

    /* ── API Tests ────────────────────────────────────────────────────── */
    {
      name: 'api',
      testDir: './api/specs',
      use: {
        /* Mock API server */
        baseURL: process.env.API_BASE_URL || 'http://localhost:3000',

        /* API tests don't need a browser — use minimal config */
        screenshot: 'off',
        video: 'off',
        trace: 'off',
      },
    },
  ],
});
