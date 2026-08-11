import { BaseScreen } from './base.screen';

/**
 * WorkoutsScreen encapsulates interactions with the workouts list page.
 * Maps to data-testid attributes in app/src/app/pages/workouts/workouts.page.ts.
 *
 * Every locator here is a CSS `[data-testid]` selector resolved in the WEBVIEW
 * context. The previous version mixed those with `~accessibility-id` lookups
 * (`$(`~workout-list`)`), which can never resolve: data-testid is a DOM
 * attribute and the accessibility-id strategy reads the native view tree. See
 * MOBILE.md.
 */
export class WorkoutsScreen extends BaseScreen {
  private selectors = {
    workoutsTitle: 'workouts-title',
    backButton: 'workouts-back-btn',
    workoutList: 'workout-list',
    searchBar: 'workout-search',
    addWorkoutFab: 'add-workout-fab',
    emptyState: 'workout-empty-state',
  };

  /**
   * Wait for the workouts screen to fully load.
   */
  async waitForWorkoutsScreen(): Promise<void> {
    await this.waitForScreen(this.selectors.workoutsTitle);
  }

  /**
   * Get the workout list container element.
   */
  get workoutList() {
    return $(this.sel(this.selectors.workoutList));
  }

  /**
   * Get the floating action button for adding a workout.
   */
  get addButton() {
    return $(this.sel(this.selectors.addWorkoutFab));
  }

  /**
   * Get a specific workout item by its zero-based index.
   */
  workoutItem(index: number) {
    return $(this.sel(`workout-list-item-${index}`));
  }

  /**
   * Get the exercise name text for a specific workout item.
   */
  async getWorkoutName(index: number): Promise<string> {
    return this.getTextById(`workout-name-${index}`);
  }

  /**
   * Get the date text for a specific workout item.
   */
  async getWorkoutDate(index: number): Promise<string> {
    return this.getTextById(`workout-date-${index}`);
  }

  /**
   * Get the duration text for a specific workout item.
   */
  async getWorkoutDuration(index: number): Promise<string> {
    return this.getTextById(`workout-duration-${index}`);
  }

  /**
   * Tap on a workout item.
   */
  async tapWorkout(index: number): Promise<void> {
    await this.tapElement(`workout-list-item-${index}`);
  }

  /**
   * Tap the FAB button to navigate to the add workout screen.
   */
  async tapAddWorkout(): Promise<void> {
    await this.tapElement(this.selectors.addWorkoutFab);
  }

  /**
   * Type into the searchbar to filter the list.
   *
   * ion-searchbar keeps its native <input> in a shadow root, so this goes
   * through the shared editable-control helper rather than setting a value on
   * the host. Filtering is client-side over the already-loaded list
   * (WorkoutsPage.filteredWorkouts), so no network round trip is involved.
   */
  async search(term: string): Promise<void> {
    await this.typeIntoField(this.selectors.searchBar, term);
    // Let Angular re-render the filtered list before callers count items.
    await browser.pause(500);
  }

  /**
   * Clear the searchbar, restoring the unfiltered list.
   *
   * clearValue() alone is not enough, and the failure is silent: it empties the
   * inner <input> but does not drive ion-searchbar's `ionInput` output, so
   * Angular's searchTerm keeps its previous value and the list stays filtered
   * while the box looks empty. Tapping the component's own clear button is both
   * what a user does and what actually emits the event; the keystroke fallback
   * covers the case where the button is not rendered (Ionic only shows it while
   * the searchbar is focused).
   */
  async clearSearch(): Promise<void> {
    // Focusing is what reveals the clear button.
    await this.tapField(this.selectors.searchBar);

    const host = await $(this.sel(this.selectors.searchBar));
    const clearButton = await host.shadow$('.searchbar-clear-button');

    if (await clearButton.isExisting().catch(() => false)) {
      await clearButton.click();
    } else {
      const current = await this.getSearchValue();
      await browser.keys(new Array(current.length).fill('Backspace'));
    }

    await browser.pause(500);
  }

  /**
   * Read the searchbar's current text from its inner native input.
   */
  async getSearchValue(): Promise<string> {
    const host = await $(this.sel(this.selectors.searchBar));
    const input = await host.shadow$('input');
    return (await input.getValue()) ?? '';
  }

  /**
   * Swipe left on a workout item to reveal a delete action.
   *
   * Kept ready deliberately. The list renders plain ion-items with no
   * ion-item-sliding wrapper, so there is nothing to reveal yet — see the
   * skipped spec and defect #2 in the README. When a delete affordance lands,
   * this is the gesture that drives it.
   */
  async swipeToDelete(index: number): Promise<void> {
    await this.swipeLeftOnElement(`workout-list-item-${index}`);
  }

  /**
   * Check if the empty state message is displayed.
   */
  async isEmptyStateDisplayed(): Promise<boolean> {
    return this.isDisplayed(this.selectors.emptyState);
  }

  /**
   * Scroll through the workout list.
   */
  async scrollThroughList(scrollCount = 3): Promise<void> {
    for (let i = 0; i < scrollCount; i++) {
      await this.scrollByViewport(0.6);
    }
  }

  /**
   * Navigate back from the workouts screen using the back button.
   */
  async tapBack(): Promise<void> {
    await this.tapElement(this.selectors.backButton);
  }

  /**
   * Count the workout items currently rendered.
   *
   * Queries the DOM for every `workout-list-item-*` at once. The previous
   * implementation probed indices one at a time and stopped at the first that
   * was not *displayed*, which under-counted the moment an item sat below the
   * fold — the rows exist in the DOM whether or not they are scrolled into
   * view, and this list is not virtualised.
   */
  async getVisibleWorkoutCount(): Promise<number> {
    const items = await $$('[data-testid^="workout-list-item-"]');
    return items.length;
  }

  /**
   * Whether a workout with the given exercise name is present in the list.
   */
  async hasWorkoutNamed(exerciseType: string): Promise<boolean> {
    const names = await $$('[data-testid^="workout-name-"]');
    for (const name of names) {
      if ((await name.getText()).trim() === exerciseType) {
        return true;
      }
    }
    return false;
  }
}
