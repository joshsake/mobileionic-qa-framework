/**
 * LoginPage — page object for the /login route.
 *
 * Encapsulates all interactions with the sign-in form so that spec files
 * read like user stories rather than DOM traversals.
 *
 * QA Strategy:
 *   - Each method maps to a single user action (fill email, click login).
 *   - Composite methods (loginAs) combine atomic actions for readability
 *     in happy-path tests while keeping granular methods available for
 *     negative/boundary tests.
 */

import { type Page } from '@playwright/test';
import { BasePage } from './base.page';
import { SELECTORS, URLS } from '../../shared/constants';

export class LoginPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // ─── Navigation ───────────────────────────────────────────────────────

  /** Navigate to the login page and wait for the form to render. */
  async navigate(): Promise<void> {
    await this.navigateTo(URLS.LOGIN);
    await this.waitForElement(SELECTORS.LOGIN_CARD);
  }

  // ─── Atomic Actions ───────────────────────────────────────────────────

  /** Fill the email field with the given value. */
  async fillEmail(email: string): Promise<void> {
    await this.fillIonicInput(SELECTORS.LOGIN_EMAIL_INPUT, email);
  }

  /** Fill the password field with the given value. */
  async fillPassword(password: string): Promise<void> {
    await this.fillIonicInput(SELECTORS.LOGIN_PASSWORD_INPUT, password);
  }

  /** Click the Login button. */
  async clickLogin(): Promise<void> {
    await this.page.locator(SELECTORS.LOGIN_SUBMIT_BTN).click();
  }

  // ─── Composite Actions ────────────────────────────────────────────────

  /**
   * Perform a full login flow: fill email, fill password, click Login,
   * and wait for navigation to the dashboard.
   */
  async loginAs(email: string, password: string): Promise<void> {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.clickLogin();
    // Wait for the dashboard route to load after successful auth
    await this.page.waitForURL('**/dashboard', { timeout: 15_000 });
    await this.waitForPageReady();
  }

  // ─── Assertions / Queries ─────────────────────────────────────────────

  /** Return the text of the error message element, or null if not visible. */
  async getErrorMessage(): Promise<string | null> {
    const errorEl = this.page.locator(SELECTORS.LOGIN_ERROR_MESSAGE);

    /*
     * isVisible() resolves immediately — it is a snapshot check and ignores the
     * timeout option entirely. The error paragraph is behind an *ngIf that only
     * renders once the login request comes back, so the old call always saw an
     * absent element and returned null before the response arrived. waitFor()
     * is the auto-waiting equivalent.
     */
    try {
      await errorEl.waitFor({ state: 'visible', timeout: 10_000 });
    } catch {
      return null;
    }

    return errorEl.textContent();
  }

  /**
   * Check whether the user has been redirected away from /login,
   * indicating a successful authentication.
   */
  isLoggedIn(): boolean {
    return !this.page.url().includes('/login');
  }

  /** Return true if the Login button is currently disabled. */
  async isSubmitDisabled(): Promise<boolean> {
    const btn = this.page.locator(SELECTORS.LOGIN_SUBMIT_BTN);
    // Ionic buttons use the "disabled" attribute
    const disabled = await btn.getAttribute('disabled');
    return disabled !== null;
  }

  /**
   * Wait until the submit button reaches the expected enabled state.
   *
   * isSubmitDisabled() is a single immediate read with no auto-waiting, so
   * calling it straight after filling a field races Angular's change detection:
   * the attribute is still present for a tick after the model updates. Tests
   * that expect a *transition* need to wait for it rather than sample once.
   */
  async waitForSubmitEnabled(enabled = true, timeout = 10_000): Promise<void> {
    await this.page.waitForFunction(
      ({ selector, want }) => {
        const el = document.querySelector(selector);
        return !!el && el.hasAttribute('disabled') !== want;
      },
      { selector: SELECTORS.LOGIN_SUBMIT_BTN, want: enabled },
      { timeout },
    );
  }
}
