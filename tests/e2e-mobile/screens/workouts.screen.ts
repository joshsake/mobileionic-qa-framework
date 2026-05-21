import { BaseScreen } from './base.screen';

/**
 * WorkoutsScreen encapsulates interactions with the workouts list page.
 * Maps to data-testid attributes in workouts.page.ts.
 */
export class WorkoutsScreen extends BaseScreen {
  private selectors = {
    workoutsTitle: 'workouts-title',
    backButton: 'workouts-back-btn',
    workoutList: 'workout-list',
    addWorkoutFab: 'add-workout-fab',
    emptyState: 'workout-empty-state',
    offlineIndicator: 'offline-indicator',
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
    return $(`~${this.selectors.workoutList}`);
  }

  /**
   * Get the floating action button for adding a workout.
   */
  get addButton() {
    return $(`~${this.selectors.addWorkoutFab}`);
  }

  /**
   * Get a specific workout item by its zero-based index.
   */
  workoutItem(index: number) {
    return $(`~workout-list-item-${index}`);
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
   * Tap on a workout item to view its details.
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
   * Swipe left on a workout item to reveal the delete action.
   */
  async swipeToDelete(index: number): Promise<void> {
    await this.swipeLeftOnElement(`workout-list-item-${index}`);
  }

  /**
   * Perform a pull-to-refresh gesture on the workout list.
   * Swipes down from the top of the list to trigger a content refresh.
   */
  async pullToRefresh(): Promise<void> {
    await this.swipeDown(0.6);
    // Wait for refresh to complete
    await browser.pause(2000);
  }

  /**
   * Check if the empty state message is displayed.
   */
  async isEmptyStateDisplayed(): Promise<boolean> {
    return this.isDisplayed(this.selectors.emptyState);
  }

  /**
   * Check if the offline indicator is visible.
   */
  async isOfflineIndicatorDisplayed(): Promise<boolean> {
    return this.isDisplayed(this.selectors.offlineIndicator);
  }

  /**
   * Scroll through the workout list to load more items.
   */
  async scrollThroughList(scrollCount = 3): Promise<void> {
    for (let i = 0; i < scrollCount; i++) {
      await this.swipeUp(0.4);
      await browser.pause(500);
    }
  }

  /**
   * Navigate back from the workouts screen using the back button.
   */
  async tapBack(): Promise<void> {
    await this.tapElement(this.selectors.backButton);
  }

  /**
   * Count visible workout items by checking sequential indices.
   */
  async getVisibleWorkoutCount(): Promise<number> {
    let count = 0;
    for (let i = 0; i < 50; i++) {
      if (await this.isDisplayed(`workout-list-item-${i}`)) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }
}
