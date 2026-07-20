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

/*
 * BASE_URL is what the CI workflows export; WEB_BASE_URL is the older local
 * name. Accept both so a developer's .env keeps working in the pipeline.
 */
const WEB_BASE_URL =
  process.env.BASE_URL || process.env.WEB_BASE_URL || 'http://localhost:8100';

/*
 * Endpoint constants in shared/constants.ts are absolute paths beginning with
 * `/api`. If API_BASE_URL also ends in `/api`, every request would resolve to
 * `/api/api/...`, so strip a trailing `/api` (and any trailing slash) here.
 */
const API_BASE_URL = (process.env.API_BASE_URL || 'http://localhost:3000')
  .replace(/\/api\/?$/, '')
  .replace(/\/$/, '');

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
    /*
     * One project per browser so CI can shard the matrix with
     * `--project=web-<browser>`. The plain `web` project is the local
     * default — it runs the mobile-sized Chromium profile, which is the
     * fastest signal while developing.
     */
    ...(
      [
        ['web', devices['Pixel 5']],
        ['web-chromium', devices['Desktop Chrome']],
        ['web-firefox', devices['Desktop Firefox']],
        ['web-webkit', devices['Desktop Safari']],
        ['web-mobile-chrome', devices['Pixel 5']],
        ['web-mobile-safari', devices['iPhone 13']],
      ] as const
    ).map(([name, device]) => ({
      name,
      testDir: './e2e-web/specs',
      use: {
        /* Ionic app under test. CI serves the production build on 4200. */
        baseURL: WEB_BASE_URL,
        ...device,
      },
    })),

    /* ── API Tests ────────────────────────────────────────────────────── */
    {
      name: 'api',
      testDir: './api/specs',
      use: {
        /* Mock API server. Paths in shared/constants.ts already carry the
         * `/api` prefix, so this must be an origin with no path segment. */
        baseURL: API_BASE_URL,

        /* API tests don't need a browser — use minimal config */
        screenshot: 'off',
        video: 'off',
        trace: 'off',
      },
    },
  ],
});
