import { BaseScreen } from './base.screen';

/**
 * AddWorkoutScreen encapsulates interactions with the add-workout form.
 * Maps to data-testid attributes in
 * app/src/app/pages/workouts/add-workout.page.ts.
 *
 * Every selector in the previous version was wrong — the screen object was
 * written against testids the page never had (`submit-workout-btn` vs the
 * actual `add-workout-submit-btn`, `exercise-type-picker` vs
 * `add-workout-exercise-select`, and so on) and looked them up with the
 * `~accessibility-id` strategy on top of that. They are aligned to the real
 * component here and resolved as CSS in the WEBVIEW context.
 */
export class AddWorkoutScreen extends BaseScreen {
  private selectors = {
    screenTitle: 'add-workout-title',
    backButton: 'add-workout-back-btn',
    exerciseSelect: 'add-workout-exercise-select',
    durationInput: 'add-workout-duration-input',
    dateInput: 'add-workout-date-input',
    notesInput: 'add-workout-notes-input',
    submitButton: 'add-workout-submit-btn',
    cancelButton: 'add-workout-cancel-btn',
    errorMessage: 'add-workout-error',
    successMessage: 'add-workout-success',
  };

  /**
   * Wait for the add workout screen to be fully loaded.
   */
  async waitForAddWorkoutScreen(): Promise<void> {
    await this.waitForScreen(this.selectors.screenTitle);
  }

  get exerciseSelect() {
    return $(this.sel(this.selectors.exerciseSelect));
  }

  get durationInput() {
    return $(this.sel(this.selectors.durationInput));
  }

  get notesInput() {
    return $(this.sel(this.selectors.notesInput));
  }

  get submitButton() {
    return $(this.sel(this.selectors.submitButton));
  }

  /**
   * Select an exercise type.
   *
   * ion-select does not expand in place: tapping it opens an ion-alert overlay
   * appended near the end of the DOM, listing each ion-select-option as a radio
   * row. Two things follow from that, and the old implementation got both
   * wrong by assuming a custom inline picker with `exercise-option-*` testids:
   *
   *  - the options are Ionic-rendered markup with no data-testid of their own,
   *    so they are matched by their visible label text;
   *  - the choice is not committed to the ngModel until the alert's OK button
   *    is tapped, so dismissing early silently leaves the field empty.
   *
   * ion-alert uses scoped styles rather than shadow DOM, so plain CSS reaches
   * inside it — unlike ion-input, which needs shadow$.
   */
  async selectExercise(exerciseType: string): Promise<void> {
    await this.tapElement(this.selectors.exerciseSelect);

    const alert = await $('ion-alert');
    await alert.waitForDisplayed({
      timeout: 10000,
      timeoutMsg: 'ion-select did not open its alert overlay',
    });

    const labels = await alert.$$('.alert-radio-label');
    let matched = false;
    for (const label of labels) {
      if ((await label.getText()).trim() === exerciseType) {
        await label.click();
        matched = true;
        break;
      }
    }
    if (!matched) {
      // ChainablePromiseArray.map already resolves to the mapped values, so
      // this is awaited directly rather than through Promise.all.
      const available = await labels.map((l) => l.getText());
      throw new Error(
        `Exercise option "${exerciseType}" not found. Available: ${JSON.stringify(available)}`
      );
    }

    await this.tapAlertButton(alert, 'OK');
    await alert.waitForDisplayed({
      timeout: 10000,
      reverse: true,
      timeoutMsg: 'ion-select alert did not dismiss after confirming',
    });
  }

  /**
   * Tap a button in an open ion-alert by its visible label.
   */
  private async tapAlertButton(
    alert: WebdriverIO.Element,
    label: string
  ): Promise<void> {
    const buttons = await alert.$$('.alert-button');
    for (const button of buttons) {
      if ((await button.getText()).trim().toUpperCase() === label.toUpperCase()) {
        await button.click();
        return;
      }
    }
    throw new Error(`Alert button "${label}" not found`);
  }

  /**
   * Enter the workout duration in minutes.
   */
  async enterDuration(minutes: number): Promise<void> {
    await this.typeIntoField(this.selectors.durationInput, minutes.toString());
  }

  /**
   * Clear the duration field, leaving the form incomplete.
   */
  async clearDuration(): Promise<void> {
    await this.clearField(this.selectors.durationInput);
  }

  /**
   * Enter optional notes for the workout.
   */
  async enterNotes(notes: string): Promise<void> {
    await this.typeIntoField(this.selectors.notesInput, notes);
  }

  /**
   * Tap the submit button to save the workout.
   */
  async tapSubmit(): Promise<void> {
    // Dismiss the keyboard first: it can cover the submit button, and a tap
    // that lands on the keyboard instead of the button fails opaquely.
    if (await driver.isKeyboardShown()) {
      await driver.hideKeyboard();
    }
    await this.tapElement(this.selectors.submitButton);
  }

  /**
   * Tap the cancel button to discard the workout.
   */
  async tapCancel(): Promise<void> {
    if (await driver.isKeyboardShown()) {
      await driver.hideKeyboard();
    }
    await this.tapElement(this.selectors.cancelButton);
  }

  /**
   * Fill out the entire add workout form and submit.
   *
   * The date field is deliberately left alone — the component seeds it with
   * today's date, so it is already valid.
   */
  async addWorkout(
    exerciseType: string,
    durationMinutes: number,
    notes?: string
  ): Promise<void> {
    await this.selectExercise(exerciseType);
    await this.enterDuration(durationMinutes);
    if (notes) {
      await this.enterNotes(notes);
    }
    await this.tapSubmit();
  }

  /**
   * Check if the error message is displayed.
   */
  async isErrorDisplayed(): Promise<boolean> {
    return this.isDisplayed(this.selectors.errorMessage);
  }

  /**
   * Get the error message text.
   */
  async getErrorText(): Promise<string> {
    return this.getTextById(this.selectors.errorMessage);
  }

  /**
   * Check if the success message is displayed.
   */
  async isSuccessDisplayed(): Promise<boolean> {
    return this.isDisplayed(this.selectors.successMessage);
  }

  /**
   * Whether the submit button is enabled.
   *
   * Reads the reflected `disabled` attribute rather than isEnabled(), which
   * always reports true for the ion-button custom element. The component binds
   * [disabled]="!exercise || !duration || !date".
   */
  async isSubmitEnabled(): Promise<boolean> {
    return !(await this.hasAttribute(this.selectors.submitButton, 'disabled'));
  }
}
