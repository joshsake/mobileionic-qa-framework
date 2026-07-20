/**
 * WorkoutsPage — page object for the /workouts route.
 *
 * Covers the workout list view where users see their logged workouts,
 * search/filter them, and navigate to add new ones.
 *
 * QA Strategy:
 *   - Methods return Locators or primitive values so assertions stay in
 *     spec files (page objects should not assert).
 *   - List-count and search helpers support both positive ("list has N
 *     items") and negative ("no results found") test scenarios.
 */

import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './base.page';
import { SELECTORS, URLS } from '../../shared/constants';

export class WorkoutsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // ─── Navigation ───────────────────────────────────────────────────────

  /** Navigate to the workouts list page. */
  async navigate(): Promise<void> {
    await this.navigateTo(URLS.WORKOUTS);
    await this.waitForPageReady();
  }

  // ─── Queries ──────────────────────────────────────────────────────────

  /** Return a locator for all workout list items. */
  getWorkoutList(): Locator {
    return this.page.locator(SELECTORS.WORKOUT_ITEM);
  }

  /** Return the number of workout items currently displayed. */
  async getWorkoutCount(): Promise<number> {
    // Allow a moment for the list to render after API fetch
    await this.page.waitForTimeout(1_000);
    return this.getWorkoutList().count();
  }

  /**
   * Return the text content of the Nth workout item (0-indexed).
   * Useful for verifying sort order or specific workout details.
   */
  async getWorkoutText(index: number): Promise<string | null> {
    return this.getWorkoutList().nth(index).textContent();
  }

  /**
   * Return the text of every rendered workout item.
   *
   * Lets a search test assert on what is actually on screen rather than on a
   * count alone — a filter that silently returned the wrong rows would still
   * produce a plausible count.
   */
  async getWorkoutTexts(): Promise<string[]> {
    return this.getWorkoutList().allTextContents();
  }

  /**
   * Wait until exactly `expected` workout items are rendered.
   *
   * Specs used to sleep on a fixed timer and then assert the count was "less
   * than or equal to" the original — an assertion that also passes when the
   * delete silently failed. Waiting for the precise count makes the assertion
   * meaningful and removes the arbitrary sleep.
   */
  async waitForWorkoutCount(expected: number, timeout = 10_000): Promise<void> {
    await this.page.waitForFunction(
      ({ selector, count }) => document.querySelectorAll(selector).length === count,
      { selector: SELECTORS.WORKOUT_ITEM, count: expected },
      { timeout },
    );
  }

  // ─── Actions ──────────────────────────────────────────────────────────

  /** Click the "Add Workout" button to navigate to the add form. */
  async clickAddWorkout(): Promise<void> {
    await this.page.locator(SELECTORS.WORKOUT_ADD_BTN).click();
    await this.page.waitForURL('**/workouts/add', { timeout: 10_000 });
    await this.waitForPageReady();
  }

  /**
   * Type a search query into the workout search bar. Passing an empty string
   * clears the filter.
   *
   * ion-searchbar is a wrapper element, not a form control, so filling it
   * directly fails with "Element is not an <input>". The native input Ionic
   * renders inside it is what carries the value and emits the event the page
   * filters on.
   */
  async searchWorkout(query: string): Promise<void> {
    const searchInput = this.page.locator(`${SELECTORS.WORKOUT_SEARCH} input`);
    await searchInput.fill(query);
    // Allow debounce/filter to run
    await this.page.waitForTimeout(500);
  }

  /** Click on a specific workout item by index to view its details. */
  async clickWorkout(index: number): Promise<void> {
    await this.getWorkoutList().nth(index).click();
    await this.waitForPageReady();
  }

  /**
   * Delete a workout by clicking its delete button.
   *
   * The list has no delete affordance yet (see the skipped spec in
   * workouts.spec.ts), so this currently finds nothing and no-ops. It is kept
   * ready for the testid the feature is expected to ship with.
   */
  async deleteWorkout(index: number): Promise<void> {
    const item = this.getWorkoutList().nth(index);
    const deleteBtn = item.locator('[data-testid="workout-delete-btn"]');
    if (await deleteBtn.isVisible().catch(() => false)) {
      await deleteBtn.click();
    }
  }
}
