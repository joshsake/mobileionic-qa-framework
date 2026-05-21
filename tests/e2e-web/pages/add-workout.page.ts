/**
 * AddWorkoutPage — page object for the /workouts/add route.
 *
 * Encapsulates the workout creation form: exercise type picker, duration
 * input, notes, date, and form submission.
 *
 * QA Strategy:
 *   - Separate methods for each form field allow tests to verify
 *     individual field validation independently.
 *   - getValidationErrors() returns all visible errors so tests can
 *     assert on specific missing-field messages without tight coupling
 *     to the error element structure.
 */

import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './base.page';
import { SELECTORS, URLS } from '../../shared/constants';

export class AddWorkoutPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // ─── Navigation ───────────────────────────────────────────────────────

  /** Navigate directly to the add-workout form. */
  async navigate(): Promise<void> {
    await this.navigateTo(URLS.ADD_WORKOUT);
    await this.waitForPageReady();
  }

  // ─── Form Field Actions ───────────────────────────────────────────────

  /**
   * Select an exercise type from the dropdown/picker.
   * Ionic may render this as an ion-select with an action sheet or popover.
   */
  async selectExercise(exerciseType: string): Promise<void> {
    const select = this.page.locator(SELECTORS.EXERCISE_TYPE_SELECT);
    await select.click();

    // Ionic renders select options in an overlay — wait for it
    const overlay = this.page.locator('ion-alert, ion-action-sheet, ion-popover');
    await overlay.waitFor({ state: 'visible', timeout: 5_000 });

    // Click the matching option
    const option = this.page.locator(`ion-radio, ion-select-option, button`)
      .filter({ hasText: exerciseType });
    await option.first().click();

    // Confirm selection if there's an OK button
    const okButton = this.page.locator('ion-alert button').filter({ hasText: /ok|confirm/i });
    if (await okButton.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await okButton.click();
    }
  }

  /** Set the workout duration in minutes. */
  async setDuration(minutes: number): Promise<void> {
    await this.fillIonicInput(SELECTORS.DURATION_INPUT, minutes.toString());
  }

  /** Set the workout notes text. */
  async setNotes(notes: string): Promise<void> {
    await this.fillIonicInput(SELECTORS.NOTES_INPUT, notes);
  }

  /** Set the workout date using the date input. */
  async setDate(isoDate: string): Promise<void> {
    await this.fillIonicInput(SELECTORS.DATE_INPUT, isoDate);
  }

  // ─── Form Submission ──────────────────────────────────────────────────

  /** Click the submit button to save the workout. */
  async submit(): Promise<void> {
    await this.page.locator(SELECTORS.WORKOUT_SUBMIT_BTN).click();
    await this.waitForPageReady();
  }

  /**
   * Fill out the entire form and submit in one call.
   * Convenience method for happy-path tests.
   */
  async fillAndSubmit(workout: {
    exerciseType: string;
    durationMinutes: number;
    notes: string;
    date?: string;
  }): Promise<void> {
    await this.selectExercise(workout.exerciseType);
    await this.setDuration(workout.durationMinutes);
    await this.setNotes(workout.notes);
    if (workout.date) {
      await this.setDate(workout.date);
    }
    await this.submit();
  }

  // ─── Validation Queries ───────────────────────────────────────────────

  /**
   * Return the text content of all currently visible validation error
   * messages on the form.
   */
  async getValidationErrors(): Promise<string[]> {
    const errors = this.page.locator(SELECTORS.VALIDATION_ERROR);
    const count = await errors.count();
    const messages: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = await errors.nth(i).textContent();
      if (text) messages.push(text.trim());
    }
    return messages;
  }

  /** Return true if the submit button is currently disabled. */
  async isSubmitDisabled(): Promise<boolean> {
    const btn = this.page.locator(SELECTORS.WORKOUT_SUBMIT_BTN);
    const disabled = await btn.getAttribute('disabled');
    return disabled !== null;
  }
}
