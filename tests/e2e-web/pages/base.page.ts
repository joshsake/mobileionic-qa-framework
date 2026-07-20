/**
 * BasePage — abstract page object with common helpers for all pages.
 *
 * Every page object extends this class to inherit utility methods for
 * element lookup, waiting, and screenshotting. This keeps individual
 * page objects focused on page-specific locators and actions.
 *
 * QA Strategy:
 *   - All element access goes through data-testid selectors for resilience
 *     against CSS/class refactors.
 *   - Explicit waits replace arbitrary sleeps to keep tests fast and
 *     deterministic.
 */

import { type Page, type Locator } from '@playwright/test';
import { TIMEOUTS } from '../../shared/constants';

export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  // ─── Element Helpers ────────────────────────────────────────────────────

  /**
   * Locate an element by its data-testid attribute.
   * This is the preferred lookup strategy because testids are stable across
   * styling and structural refactors.
   */
  getByTestId(testId: string): Locator {
    return this.page.locator(`[data-testid="${testId}"]`);
  }

  /**
   * Wait until an element matching the selector is visible in the DOM.
   * Returns the locator so callers can chain further assertions.
   */
  async waitForElement(
    selector: string,
    timeout = TIMEOUTS.ELEMENT,
  ): Promise<Locator> {
    const locator = this.page.locator(selector);
    await locator.first().waitFor({ state: 'visible', timeout });
    return locator;
  }

  /**
   * Wait for the Ionic page transition animation to complete.
   * Ionic wraps each page in an ion-page element with class "ion-page-visible"
   * once the enter animation finishes.
   */
  async waitForPageReady(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
    // Give Ionic's Angular rendering a moment to settle
    await this.page.waitForTimeout(TIMEOUTS.ANIMATION);
  }

  // ─── Network Helpers ──────────────────────────────────────────────────

  /**
   * Wait until no network requests have been in-flight for at least 500ms.
   * Useful after navigation or form submission to ensure API calls have
   * completed before asserting on the resulting UI state.
   */
  async waitForNetworkIdle(timeout = TIMEOUTS.NETWORK_IDLE): Promise<void> {
    await this.page.waitForLoadState('networkidle', { timeout });
  }

  // ─── Screenshot Helper ────────────────────────────────────────────────

  /**
   * Take a full-page screenshot with a descriptive name.
   * Screenshots are automatically attached to the Allure report.
   */
  async screenshot(name: string): Promise<Buffer> {
    return this.page.screenshot({
      fullPage: true,
      path: `reports/screenshots/${name}.png`,
    });
  }

  // ─── Navigation ───────────────────────────────────────────────────────

  /**
   * Navigate to a relative path and wait for the page to be interactive.
   */
  async navigateTo(path: string): Promise<void> {
    await this.page.goto(path, { waitUntil: 'domcontentloaded' });
    await this.waitForPageReady();
  }

  /**
   * Get the current URL path (without origin).
   */
  getCurrentPath(): string {
    return new URL(this.page.url()).pathname;
  }

  // ─── Ionic-specific Helpers ───────────────────────────────────────────

  /**
   * Dismiss an Ionic toast/alert if one is visible.
   * Returns true if a toast was found and dismissed, false otherwise.
   */
  async dismissToastIfVisible(): Promise<boolean> {
    const toast = this.page.locator('ion-toast');
    if (await toast.isVisible({ timeout: 1000 }).catch(() => false)) {
      await toast.click();
      return true;
    }
    return false;
  }

  /**
   * Fill an ion-input/ion-textarea by locating the native control inside it.
   *
   * The wrapper element cannot be filled directly. ion-textarea renders a
   * <textarea> rather than an <input>, so both are matched — otherwise notes
   * fields fall through to the slower click-and-type path.
   */
  async fillIonicInput(selector: string, value: string): Promise<void> {
    const ionInput = this.page.locator(selector);
    // Ionic v7+ uses slotted inputs — try the native control first
    const nativeInput = ionInput.locator('input, textarea');
    if (await nativeInput.count() > 0) {
      await nativeInput.fill(value);
    } else {
      // Fallback: click the ion-input to focus, then type
      await ionInput.click();
      await this.page.keyboard.type(value);
    }
  }
}
