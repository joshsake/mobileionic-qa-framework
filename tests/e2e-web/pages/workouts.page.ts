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

  // ─── Actions ──────────────────────────────────────────────────────────

  /** Click the "Add Workout" button to navigate to the add form. */
  async clickAddWorkout(): Promise<void> {
    await this.page.locator(SELECTORS.WORKOUT_ADD_BTN).click();
    await this.page.waitForURL('**/workouts/add', { timeout: 10_000 });
    await this.waitForPageReady();
  }

  /** Type a search query into the workout search bar. */
  async searchWorkout(query: string): Promise<void> {
    const searchInput = this.page.locator(SELECTORS.WORKOUT_SEARCH);
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
   * Delete a workout by swiping left (Ionic gesture) or clicking the
   * delete button if available.
   */
  async deleteWorkout(index: number): Promise<void> {
    const item = this.getWorkoutList().nth(index);
    const deleteBtn = item.locator('[data-testid="workout-delete-btn"]');
    if (await deleteBtn.isVisible().catch(() => false)) {
      await deleteBtn.click();
    }
  }
}
