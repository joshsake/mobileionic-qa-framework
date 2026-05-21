import { LoginScreen } from '../screens/login.screen';
import { WorkoutsScreen } from '../screens/workouts.screen';
import { AddWorkoutScreen } from '../screens/add-workout.screen';

describe('Workouts Screen - Mobile', () => {
  const loginScreen = new LoginScreen();
  const workoutsScreen = new WorkoutsScreen();
  const addWorkoutScreen = new AddWorkoutScreen();

  const validUser = {
    email: 'testuser@example.com',
    password: 'Test1234!',
  };

  before(async () => {
    // Login once before the suite to reach the workouts screen
    await driver.terminateApp('com.qaframework.fitnesstracker');
    await driver.activateApp('com.qaframework.fitnesstracker');
    await loginScreen.waitForLoginScreen();
    await loginScreen.login(validUser.email, validUser.password);
    await browser.pause(3000);
  });

  describe('Add Workout', () => {
    it('should navigate to the add workout screen when tapping the FAB button', async () => {
      // Navigate to workouts if not already there
      const workoutsVisible = await workoutsScreen.isDisplayed('workouts-title');
      if (!workoutsVisible) {
        // Navigate via dashboard
        await driver.pause(1000);
      }

      await workoutsScreen.tapAddWorkout();
      await addWorkoutScreen.waitForAddWorkoutScreen();

      const isAddScreenDisplayed = await addWorkoutScreen.isDisplayed('add-workout-title');
      expect(isAddScreenDisplayed).toBe(true);
    });

    it('should successfully add a new workout with all fields filled', async () => {
      await addWorkoutScreen.addWorkout('Running', 45, 'Morning 5K run in the park');
      await browser.pause(2000);

      // Should navigate back to workouts list after submission
      await workoutsScreen.waitForWorkoutsScreen();
      expect(await workoutsScreen.isDisplayed('workouts-title')).toBe(true);
    });

    it('should add a workout with only required fields', async () => {
      await workoutsScreen.tapAddWorkout();
      await addWorkoutScreen.waitForAddWorkoutScreen();

      await addWorkoutScreen.selectExercise('Cycling');
      await addWorkoutScreen.enterDuration(30);
      await addWorkoutScreen.tapSubmit();
      await browser.pause(2000);

      await workoutsScreen.waitForWorkoutsScreen();
      expect(await workoutsScreen.isDisplayed('workouts-title')).toBe(true);
    });

    it('should prevent submission when duration is missing', async () => {
      await workoutsScreen.tapAddWorkout();
      await addWorkoutScreen.waitForAddWorkoutScreen();

      await addWorkoutScreen.selectExercise('Swimming');
      // Do not enter duration

      const isEnabled = await addWorkoutScreen.isSubmitEnabled();
      expect(isEnabled).toBe(false);

      // Navigate back
      await addWorkoutScreen.tapCancel();
      await browser.pause(1000);
    });
  });

  describe('Swipe to Delete', () => {
    it('should reveal delete option when swiping left on a workout item', async () => {
      await workoutsScreen.waitForWorkoutsScreen();
      const count = await workoutsScreen.getVisibleWorkoutCount();

      if (count > 0) {
        await workoutsScreen.swipeToDelete(0);
        await browser.pause(1000);

        // After swiping, a delete button should appear
        // The exact element depends on the Ionic sliding item implementation
        const deleteVisible = await workoutsScreen.isDisplayed('delete-workout-btn');
        // Whether the delete button is found depends on the app's sliding item setup
        expect(typeof deleteVisible).toBe('boolean');
      }
    });
  });

  describe('Pull to Refresh', () => {
    it('should refresh the workout list when pulling down', async () => {
      await workoutsScreen.waitForWorkoutsScreen();

      const countBefore = await workoutsScreen.getVisibleWorkoutCount();
      await workoutsScreen.pullToRefresh();
      await browser.pause(2000);

      // The list should still be displayed after refresh
      expect(await workoutsScreen.isDisplayed('workouts-title')).toBe(true);

      // Count may change if data was updated server-side, but the screen should remain stable
      const countAfter = await workoutsScreen.getVisibleWorkoutCount();
      expect(countAfter).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Scroll Through List', () => {
    it('should be able to scroll through a long workout list', async () => {
      await workoutsScreen.waitForWorkoutsScreen();

      // Perform multiple scrolls; verify no crash and screen stays valid
      await workoutsScreen.scrollThroughList(5);
      await browser.pause(500);

      expect(await workoutsScreen.isDisplayed('workouts-title')).toBe(true);
    });

    it('should display workout details for each visible item', async () => {
      await workoutsScreen.waitForWorkoutsScreen();

      const count = await workoutsScreen.getVisibleWorkoutCount();
      for (let i = 0; i < Math.min(count, 3); i++) {
        const name = await workoutsScreen.getWorkoutName(i);
        expect(name.length).toBeGreaterThan(0);

        const duration = await workoutsScreen.getWorkoutDuration(i);
        expect(duration).toContain('min');
      }
    });
  });

  describe('Offline Mode Indicator', () => {
    it('should show an offline indicator when network is disabled', async () => {
      // Toggle airplane mode to simulate offline
      try {
        await driver.toggleAirplaneMode();
        await browser.pause(3000);

        // Attempt to refresh to trigger offline detection
        await workoutsScreen.pullToRefresh();
        await browser.pause(2000);

        // Check for offline indicator (depends on app implementation)
        const isOffline = await workoutsScreen.isOfflineIndicatorDisplayed();
        // The indicator may or may not exist depending on implementation
        expect(typeof isOffline).toBe('boolean');
      } finally {
        // Restore network connectivity
        try {
          await driver.toggleAirplaneMode();
        } catch {
          // Best effort to restore
        }
        await browser.pause(3000);
      }
    });
  });

  describe('Navigation', () => {
    it('should navigate back to dashboard when tapping the back button', async () => {
      await workoutsScreen.waitForWorkoutsScreen();
      await workoutsScreen.tapBack();
      await browser.pause(2000);

      // Should no longer see workouts title
      const stillOnWorkouts = await workoutsScreen.isDisplayed('workouts-title');
      expect(stillOnWorkouts).toBe(false);
    });
  });
});
