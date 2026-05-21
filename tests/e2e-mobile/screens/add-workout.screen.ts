import { BaseScreen } from './base.screen';

/**
 * AddWorkoutScreen encapsulates interactions with the add-workout form.
 * Maps to data-testid attributes expected in the add-workout page component.
 */
export class AddWorkoutScreen extends BaseScreen {
  private selectors = {
    screenTitle: 'add-workout-title',
    exercisePicker: 'exercise-type-picker',
    exercisePickerDone: 'exercise-picker-done',
    durationInput: 'workout-duration-input',
    notesInput: 'workout-notes-input',
    dateInput: 'workout-date-input',
    submitButton: 'submit-workout-btn',
    cancelButton: 'cancel-workout-btn',
    validationError: 'workout-validation-error',
  };

  /**
   * Wait for the add workout screen to be fully loaded.
   */
  async waitForAddWorkoutScreen(): Promise<void> {
    await this.waitForScreen(this.selectors.screenTitle);
  }

  /**
   * Get the exercise type picker element.
   */
  get exercisePicker() {
    return $(`~${this.selectors.exercisePicker}`);
  }

  /**
   * Get the duration input element.
   */
  get durationInput() {
    return $(`~${this.selectors.durationInput}`);
  }

  /**
   * Get the notes input element.
   */
  get notesInput() {
    return $(`~${this.selectors.notesInput}`);
  }

  /**
   * Get the submit button element.
   */
  get submitButton() {
    return $(`~${this.selectors.submitButton}`);
  }

  /**
   * Select an exercise type from the picker by tapping the picker
   * and then selecting the desired option.
   */
  async selectExercise(exerciseType: string): Promise<void> {
    await this.tapElement(this.selectors.exercisePicker);
    // Wait for picker to animate open
    await browser.pause(500);

    // Tap the option matching the exercise type
    const option = await $(`~exercise-option-${exerciseType.toLowerCase()}`);
    await option.waitForDisplayed({ timeout: 5000 });
    await option.click();

    // Confirm picker selection if a done button exists
    const doneExists = await this.isDisplayed(this.selectors.exercisePickerDone);
    if (doneExists) {
      await this.tapElement(this.selectors.exercisePickerDone);
    }
  }

  /**
   * Enter the workout duration in minutes.
   */
  async enterDuration(minutes: number): Promise<void> {
    await this.typeIntoField(this.selectors.durationInput, minutes.toString());
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
    // Dismiss keyboard first to ensure submit button is tappable
    if (await driver.isKeyboardShown()) {
      await driver.hideKeyboard();
    }
    await this.tapElement(this.selectors.submitButton);
  }

  /**
   * Tap the cancel button to discard the workout.
   */
  async tapCancel(): Promise<void> {
    await this.tapElement(this.selectors.cancelButton);
  }

  /**
   * Fill out the entire add workout form and submit.
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
   * Check if a validation error message is displayed.
   */
  async isValidationErrorDisplayed(): Promise<boolean> {
    return this.isDisplayed(this.selectors.validationError);
  }

  /**
   * Get the validation error message text.
   */
  async getValidationErrorText(): Promise<string> {
    return this.getTextById(this.selectors.validationError);
  }

  /**
   * Check if the submit button is enabled (all required fields filled).
   */
  async isSubmitEnabled(): Promise<boolean> {
    const btn = await $(`~${this.selectors.submitButton}`);
    return btn.isEnabled();
  }
}
