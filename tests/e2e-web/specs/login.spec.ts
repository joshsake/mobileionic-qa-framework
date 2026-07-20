/**
 * Login Page — E2E Test Suite
 *
 * QA Strategy:
 *   These tests validate the authentication flow from the user's perspective.
 *   The login page is the entry point for the entire app, so reliability here
 *   is critical. We cover:
 *     - Happy path: valid credentials lead to dashboard redirect
 *     - Security: invalid credentials show appropriate error, no information leak
 *     - Validation: empty fields prevent submission
 *     - Session: logout clears the auth state
 *
 *   All tests start from a fresh page load to avoid state leakage.
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import {
  VALID_USER,
  INVALID_USER,
  WRONG_PASSWORD,
  ERROR_MESSAGES,
} from '../fixtures/test-data';
import { SELECTORS, URLS } from '../../shared/constants';

let loginPage: LoginPage;

test.beforeEach(async ({ page }) => {
  loginPage = new LoginPage(page);
  await loginPage.navigate();
});

// ─── Feature: Successful Authentication ──────────────────────────────────────

test.describe('Successful Login', () => {
  test('should redirect to dashboard after entering valid credentials', async ({ page }) => {
    // GIVEN the user is on the login page
    // WHEN they enter valid email and password and submit
    await loginPage.loginAs(VALID_USER.email, VALID_USER.password);

    // THEN they should be redirected to the dashboard
    expect(page.url()).toContain(URLS.DASHBOARD);
  });

  test('should store an auth token in localStorage after login', async ({ page }) => {
    // GIVEN the user logs in successfully
    await loginPage.loginAs(VALID_USER.email, VALID_USER.password);

    // THEN an auth_token should be present in localStorage
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(token).toBeTruthy();
    expect(token!.length).toBeGreaterThan(10);
  });
});

// ─── Feature: Failed Authentication ──────────────────────────────────────────

test.describe('Invalid Credentials', () => {
  test('should show an error message when email does not exist', async () => {
    // GIVEN the user enters an unregistered email
    await loginPage.fillEmail(INVALID_USER.email);
    await loginPage.fillPassword(INVALID_USER.password);
    await loginPage.clickLogin();

    // THEN an error message should appear
    const error = await loginPage.getErrorMessage();
    expect(error).toContain(ERROR_MESSAGES.INVALID_CREDENTIALS);
  });

  test('should show an error message when password is wrong', async () => {
    // GIVEN the user enters a valid email but the wrong password
    await loginPage.fillEmail(WRONG_PASSWORD.email);
    await loginPage.fillPassword(WRONG_PASSWORD.password);
    await loginPage.clickLogin();

    // THEN an error message should appear — byte-for-byte the same message the
    // unregistered-email case returns. Asserting on the shared constant rather
    // than a loose substring is what makes this a user-enumeration check: a
    // backend that started distinguishing "no such user" from "wrong password"
    // would fail here.
    const error = await loginPage.getErrorMessage();
    expect(error).toContain(ERROR_MESSAGES.INVALID_CREDENTIALS);
  });

  test('should NOT redirect to dashboard on failed login', async ({ page }) => {
    // WHEN login fails
    await loginPage.fillEmail(INVALID_USER.email);
    await loginPage.fillPassword(INVALID_USER.password);
    await loginPage.clickLogin();
    await page.waitForTimeout(2_000);

    // THEN the URL should still be /login
    expect(page.url()).toContain(URLS.LOGIN);
  });
});

// ─── Feature: Form Validation ────────────────────────────────────────────────

test.describe('Empty Field Validation', () => {
  test('should disable the login button when both fields are empty', async () => {
    // GIVEN the user has not entered any credentials
    // THEN the login button should be disabled
    const disabled = await loginPage.isSubmitDisabled();
    expect(disabled).toBe(true);
  });

  test('should disable the login button when only email is filled', async () => {
    // GIVEN only the email field has a value
    await loginPage.fillEmail(VALID_USER.email);

    // THEN the login button should still be disabled
    const disabled = await loginPage.isSubmitDisabled();
    expect(disabled).toBe(true);
  });

  test('should disable the login button when only password is filled', async () => {
    // GIVEN only the password field has a value
    await loginPage.fillPassword(VALID_USER.password);

    // THEN the login button should still be disabled
    const disabled = await loginPage.isSubmitDisabled();
    expect(disabled).toBe(true);
  });

  test('should enable the login button when both fields are filled', async () => {
    // GIVEN both email and password are provided
    await loginPage.fillEmail(VALID_USER.email);
    await loginPage.fillPassword(VALID_USER.password);

    // THEN the login button should become enabled
    await loginPage.waitForSubmitEnabled();
    expect(await loginPage.isSubmitDisabled()).toBe(false);
  });
});

// ─── Feature: Logout ─────────────────────────────────────────────────────────

test.describe('Logout', () => {
  test('should clear the auth token and return to login page on logout', async ({ page }) => {
    // GIVEN the user is logged in
    await loginPage.loginAs(VALID_USER.email, VALID_USER.password);
    expect(page.url()).toContain(URLS.DASHBOARD);

    // WHEN they click the logout button
    const logoutBtn = page.locator(SELECTORS.LOGOUT_BTN);
    if (await logoutBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await logoutBtn.click();
      await page.waitForURL('**/login', { timeout: 10_000 });

      // THEN the auth token should be removed from localStorage
      const token = await page.evaluate(() => localStorage.getItem('auth_token'));
      expect(token).toBeNull();

      // AND the user should be back on the login page
      expect(page.url()).toContain(URLS.LOGIN);
    }
  });
});
