import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { URLS, SELECTORS, TIMEOUTS } from '../../shared/constants';
import { KNOWN_VIOLATIONS, KNOWN_RULE_IDS } from '../known-violations';

/**
 * Automated accessibility checks over every route in the app.
 *
 * These run as their own Playwright project rather than inside the web suite,
 * because axe evaluates DOM semantics — the result is the same in Chromium,
 * Firefox and WebKit, so running it five times would cost four extra runs to
 * learn nothing. It runs once on desktop and once on a mobile viewport, since
 * layout (and therefore what is rendered at all) does differ there.
 *
 * The assertion is "no violation outside the documented set" rather than "no
 * violations". The app has three real, recorded defects (see
 * known-violations.ts); failing the whole suite on those would make the gate
 * permanently red and therefore ignored, while asserting nothing would let the
 * fourth defect through unnoticed.
 */

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

const CREDENTIALS = { email: 'test@example.com', password: 'password123' };

/** Log in and land on the dashboard. */
async function login(page: Page): Promise<void> {
  await page.goto(URLS.LOGIN);
  await page.locator(SELECTORS.LOGIN_CARD).waitFor({ timeout: TIMEOUTS.ELEMENT });
  // Ionic keeps the native input inside ion-input's shadow root; Playwright
  // pierces it, so a descendant selector is enough here.
  await page.locator(`${SELECTORS.LOGIN_EMAIL_INPUT} input`).fill(CREDENTIALS.email);
  await page.locator(`${SELECTORS.LOGIN_PASSWORD_INPUT} input`).fill(CREDENTIALS.password);
  await page.locator(SELECTORS.LOGIN_SUBMIT_BTN).click();
  await page.waitForURL('**/dashboard', { timeout: TIMEOUTS.NAVIGATION });
}

/** Run axe against the current page and return the violations. */
async function analyze(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  return results.violations;
}

/** Format violations for a failure message that names the actual problem. */
function describe(violations: { id: string; impact?: string | null; help: string; nodes: unknown[] }[]): string {
  if (violations.length === 0) return 'none';
  return violations
    .map((v) => `${v.id} [${v.impact}] — ${v.help} (${v.nodes.length} node(s))`)
    .join('\n  ');
}

const ROUTES = [
  { name: 'login', path: URLS.LOGIN, authenticated: false, ready: SELECTORS.LOGIN_CARD },
  { name: 'dashboard', path: URLS.DASHBOARD, authenticated: true, ready: SELECTORS.DASHBOARD_TITLE },
  { name: 'workouts', path: URLS.WORKOUTS, authenticated: true, ready: SELECTORS.WORKOUT_LIST },
  { name: 'add workout', path: URLS.ADD_WORKOUT, authenticated: true, ready: SELECTORS.WORKOUT_SUBMIT_BTN },
  { name: 'history', path: URLS.HISTORY, authenticated: true, ready: '[data-testid="history-title"]' },
  { name: 'profile', path: URLS.PROFILE, authenticated: true, ready: SELECTORS.PROFILE_SAVE_BTN },
] as const;

test.describe('Accessibility (WCAG 2.1 A/AA)', () => {
  for (const route of ROUTES) {
    test(`${route.name} has no accessibility violations beyond the documented ones`, async ({ page }) => {
      if (route.authenticated) {
        await login(page);
        await page.goto(route.path);
      } else {
        await page.goto(route.path);
      }
      await page.locator(route.ready).first().waitFor({ timeout: TIMEOUTS.ELEMENT });

      const violations = await analyze(page);
      const unexpected = violations.filter((v) => !KNOWN_RULE_IDS.has(v.id));

      expect(
        unexpected,
        `Unexpected accessibility violations on ${route.path}:\n  ${describe(unexpected)}\n` +
          `If one of these is accepted, add it to tests/a11y/known-violations.ts with a rationale.`
      ).toEqual([]);
    });
  }

  /**
   * Keeps the baseline honest in the other direction.
   *
   * An allowlist that is never re-checked becomes permanent: someone fixes the
   * viewport meta, nothing tells them the entry is now stale, and the list
   * grows into a list of rules this project simply does not enforce. This fails
   * when a documented violation stops reproducing — the failure means "good
   * news, delete the entry", and the message says so.
   */
  test('the documented-violation list has no stale entries', async ({ page }) => {
    const seen = new Set<string>();

    for (const route of ROUTES) {
      if (route.authenticated) {
        await login(page);
        await page.goto(route.path);
      } else {
        await page.goto(route.path);
      }
      await page.locator(route.ready).first().waitFor({ timeout: TIMEOUTS.ELEMENT });

      for (const violation of await analyze(page)) {
        seen.add(violation.id);
      }
    }

    const stale = KNOWN_VIOLATIONS.filter((v) => !seen.has(v.rule)).map((v) => v.rule);

    expect(
      stale,
      `These rules are recorded in tests/a11y/known-violations.ts but no longer fail: ` +
        `${stale.join(', ')}. They appear to be fixed — remove them from the list so the ` +
        `suite starts enforcing them.`
    ).toEqual([]);
  });
});

/**
 * The documented defects, each as a spec that asserts the *correct* behaviour.
 *
 * Skipped rather than deleted, following how the API and mobile suites record
 * their known defects: the expectation is committed, so the day the app is
 * fixed these are un-skipped and the regression is guarded forever after.
 */
test.describe('Known accessibility defects', () => {
  test.skip('zooming is not disabled (meta-viewport)', async ({ page }) => {
    // Fix: drop `maximum-scale=1.0, user-scalable=no` from app/src/index.html.
    await page.goto(URLS.LOGIN);
    await page.locator(SELECTORS.LOGIN_CARD).waitFor({ timeout: TIMEOUTS.ELEMENT });

    const violations = await analyze(page);

    expect(violations.filter((v) => v.id === 'meta-viewport')).toEqual([]);
  });

  test.skip('icon-only buttons have accessible names (button-name)', async ({ page }) => {
    // Fix: aria-label on the logout button and the add-workout FAB.
    await login(page);

    const dashboard = await analyze(page);
    expect(dashboard.filter((v) => v.id === 'button-name')).toEqual([]);

    await page.goto(URLS.WORKOUTS);
    await page.locator(SELECTORS.WORKOUT_LIST).waitFor({ timeout: TIMEOUTS.ELEMENT });

    const workouts = await analyze(page);
    expect(workouts.filter((v) => v.id === 'button-name')).toEqual([]);
  });

  test.skip('icons are labelled or hidden from assistive tech (role-img-alt)', async ({ page }) => {
    // Fix: aria-hidden="true" on decorative ion-icons, aria-label on meaningful ones.
    await login(page);

    const violations = await analyze(page);

    expect(violations.filter((v) => v.id === 'role-img-alt')).toEqual([]);
  });
});
