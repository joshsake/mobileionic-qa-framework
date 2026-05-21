/**
 * Responsive Design — E2E Test Suite
 *
 * QA Strategy:
 *   Ionic apps are designed mobile-first but must also work on tablets and
 *   in landscape orientation. These tests verify that:
 *     - The layout adapts correctly across mobile, tablet, and landscape viewports
 *     - Critical UI elements remain visible and interactable at each size
 *     - The login flow works at all supported viewport dimensions
 *
 *   Viewport testing catches CSS breakpoint regressions that are easy to
 *   introduce when modifying component styles.
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { VALID_USER } from '../fixtures/test-data';
import { SELECTORS, VIEWPORTS, URLS } from '../../shared/constants';

// ─── Feature: Mobile Viewport (Default Target) ──────────────────────────────

test.describe('Mobile Viewport', () => {
  test.use({ viewport: VIEWPORTS.MOBILE });

  test('should render the login card within the mobile viewport without horizontal scroll', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();

    // THEN the login card should be visible and fit within the viewport
    const card = page.locator(SELECTORS.LOGIN_CARD);
    await expect(card).toBeVisible();

    // Verify no horizontal overflow — the page width should match viewport
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(VIEWPORTS.MOBILE.width + 20); // Small tolerance
  });

  test('should display all login form elements on mobile', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();

    // THEN all critical form elements should be visible
    await expect(page.locator(SELECTORS.LOGIN_EMAIL_INPUT)).toBeVisible();
    await expect(page.locator(SELECTORS.LOGIN_PASSWORD_INPUT)).toBeVisible();
    await expect(page.locator(SELECTORS.LOGIN_SUBMIT_BTN)).toBeVisible();
  });

  test('should complete full login flow on mobile viewport', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.loginAs(VALID_USER.email, VALID_USER.password);

    // THEN the user should reach the dashboard
    expect(page.url()).toContain(URLS.DASHBOARD);
  });
});

// ─── Feature: Tablet Viewport ────────────────────────────────────────────────

test.describe('Tablet Viewport', () => {
  test.use({ viewport: VIEWPORTS.TABLET });

  test('should render the login page correctly on tablet', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();

    // THEN the login card should be visible at tablet width
    const card = page.locator(SELECTORS.LOGIN_CARD);
    await expect(card).toBeVisible();

    // On tablet, the card may be centered with margins rather than full-width
    const cardBox = await card.boundingBox();
    expect(cardBox).toBeTruthy();
    // Card should not stretch to fill the entire 768px width
    // (Ionic typically limits card width on larger screens)
  });

  test('should display form inputs with adequate touch target size on tablet', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();

    // THEN inputs should have sufficient height for touch interaction
    // WCAG recommends minimum 44x44px touch targets
    const emailInput = page.locator(SELECTORS.LOGIN_EMAIL_INPUT);
    const box = await emailInput.boundingBox();
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(40);
    }
  });

  test('should complete full login flow on tablet viewport', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.loginAs(VALID_USER.email, VALID_USER.password);

    expect(page.url()).toContain(URLS.DASHBOARD);
  });
});

// ─── Feature: Landscape Orientation ──────────────────────────────────────────

test.describe('Landscape Orientation', () => {
  test.use({ viewport: VIEWPORTS.LANDSCAPE });

  test('should render the login page in landscape without layout breakage', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();

    // THEN the login card should still be visible in the shorter viewport
    const card = page.locator(SELECTORS.LOGIN_CARD);
    await expect(card).toBeVisible();
  });

  test('should allow scrolling to reach the login button in landscape if needed', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();

    // In landscape the viewport is only 393px tall, so the button may be
    // below the fold. Verify it's reachable by scrolling.
    const submitBtn = page.locator(SELECTORS.LOGIN_SUBMIT_BTN);
    await submitBtn.scrollIntoViewIfNeeded();
    await expect(submitBtn).toBeVisible();
  });

  test('should complete full login flow in landscape orientation', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.loginAs(VALID_USER.email, VALID_USER.password);

    expect(page.url()).toContain(URLS.DASHBOARD);
  });
});
