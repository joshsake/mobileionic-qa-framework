/**
 * ProfilePage — page object for the /profile route.
 *
 * Covers the user profile view where the display name and email are shown,
 * and the user can update their display name.
 *
 * QA Strategy:
 *   - Read methods (getDisplayName, getEmail) verify data binding from the
 *     API response to the UI.
 *   - Write methods (updateName, save) support testing the profile update
 *     flow end-to-end, including optimistic UI updates and error states.
 */

import { type Page } from '@playwright/test';
import { BasePage } from './base.page';
import { SELECTORS, URLS } from '../../shared/constants';

export class ProfilePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // ─── Navigation ───────────────────────────────────────────────────────

  /** Navigate to the profile page. */
  async navigate(): Promise<void> {
    await this.navigateTo(URLS.PROFILE);
    await this.waitForPageReady();
  }

  // ─── Queries ──────────────────────────────────────────────────────────

  /** Return the displayed user name text. */
  async getDisplayName(): Promise<string | null> {
    const el = this.page.locator(SELECTORS.PROFILE_NAME);
    await el.waitFor({ state: 'visible', timeout: 5_000 });
    return el.textContent();
  }

  /** Return the displayed email text. */
  async getEmail(): Promise<string | null> {
    const el = this.page.locator(SELECTORS.PROFILE_EMAIL);
    await el.waitFor({ state: 'visible', timeout: 5_000 });
    return el.textContent();
  }

  // ─── Actions ──────────────────────────────────────────────────────────

  /**
   * Clear the name input and type a new display name.
   * Does NOT save — call save() separately so tests can assert on the
   * intermediate state (e.g., unsaved-changes indicator).
   */
  async updateName(newName: string): Promise<void> {
    const input = this.page.locator(SELECTORS.PROFILE_NAME_INPUT);
    await input.clear();
    await this.fillIonicInput(SELECTORS.PROFILE_NAME_INPUT, newName);
  }

  /** Click the Save button to persist profile changes. */
  async save(): Promise<void> {
    await this.page.locator(SELECTORS.PROFILE_SAVE_BTN).click();
    await this.waitForNetworkIdle();
  }

  /**
   * Update the display name and save in one call.
   * Convenience method for happy-path tests.
   */
  async updateNameAndSave(newName: string): Promise<void> {
    await this.updateName(newName);
    await this.save();
  }
}
