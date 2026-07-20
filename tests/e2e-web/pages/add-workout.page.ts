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

import { type Page } from '@playwright/test';
import { BasePage } from './base.page';
import { SELECTORS, TIMEOUTS, URLS } from '../../shared/constants';

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
   * Select an exercise type from the ion-select picker.
   *
   * The ion-select-option elements sit in the DOM but are never visible —
   * Ionic only copies their labels into an overlay once the select is tapped,
   * so clicking an option element directly can never succeed. This drives the
   * overlay the way a user does: open the select, pick the visible label,
   * confirm, then wait for the overlay to tear down (its backdrop swallows
   * clicks aimed at the next field until it is gone).
   */
  async selectExercise(exerciseType: string): Promise<void> {
    await this.page.locator(SELECTORS.EXERCISE_TYPE_SELECT).click();

    const overlay = this.page
      .locator('ion-alert, ion-action-sheet, ion-popover')
      .first();
    await overlay.waitFor({ state: 'visible', timeout: TIMEOUTS.ELEMENT });

    /*
     * Which role the option carries depends on the select's interface: the
     * default alert renders radios, a popover renders options and an action
     * sheet renders buttons. Matching the accessible name exactly stops a
     * short type ("Running") from also selecting a longer one that contains it.
     */
    const option = overlay
      .getByRole('radio', { name: exerciseType, exact: true })
      .or(overlay.getByRole('option', { name: exerciseType, exact: true }))
      .or(overlay.getByRole('button', { name: exerciseType, exact: true }));
    await option.first().click();

    // Only the alert interface asks for confirmation; the others apply the
    // choice on click and have no OK button to press.
    const confirmButton = overlay.getByRole('button', {
      name: /^(ok|confirm|done)$/i,
    });
    if ((await confirmButton.count()) > 0) {
      await confirmButton.first().click();
    }

    await overlay.waitFor({ state: 'hidden', timeout: TIMEOUTS.ELEMENT });
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

  /**
   * Return true if the submit button is currently disabled.
   *
   * Read the attribute rather than using Playwright's isDisabled()/
   * toBeDisabled(): those only recognise natively disableable elements, and
   * ion-button is a custom element, so they report a disabled Save button as
   * enabled. Ionic does reflect the state onto the attribute, so that is the
   * signal to trust here.
   */
  async isSubmitDisabled(): Promise<boolean> {
    const btn = this.page.locator(SELECTORS.WORKOUT_SUBMIT_BTN);
    const disabled = await btn.getAttribute('disabled');
    return disabled !== null;
  }
}
