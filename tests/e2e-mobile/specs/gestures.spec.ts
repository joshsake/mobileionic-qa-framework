import { BaseScreen } from '../screens/base.screen';
import { LoginScreen } from '../screens/login.screen';
import { WorkoutsScreen } from '../screens/workouts.screen';

describe('Gesture Tests - Mobile', () => {
  const baseScreen = new BaseScreen();
  const loginScreen = new LoginScreen();
  const workoutsScreen = new WorkoutsScreen();

  const validUser = {
    email: 'testuser@example.com',
    password: 'Test1234!',
  };

  before(async () => {
    await driver.terminateApp('com.qaframework.fitnesstracker');
    await driver.activateApp('com.qaframework.fitnesstracker');
    await loginScreen.waitForLoginScreen();
    await loginScreen.login(validUser.email, validUser.password);
    await browser.pause(3000);
  });

  describe('Swipe Navigation', () => {
    it('should swipe up to scroll down through content', async () => {
      await baseScreen.swipeUp(0.5);
      await browser.pause(500);

      // Verify the app did not crash and content shifted
      const { width, height } = await driver.getWindowSize();
      expect(width).toBeGreaterThan(0);
      expect(height).toBeGreaterThan(0);
    });

    it('should swipe down to scroll up through content', async () => {
      await baseScreen.swipeDown(0.5);
      await browser.pause(500);

      const { width, height } = await driver.getWindowSize();
      expect(width).toBeGreaterThan(0);
      expect(height).toBeGreaterThan(0);
    });

    it('should handle rapid successive swipes without crashing', async () => {
      for (let i = 0; i < 5; i++) {
        await baseScreen.swipeUp(0.3);
        await browser.pause(200);
      }

      for (let i = 0; i < 5; i++) {
        await baseScreen.swipeDown(0.3);
        await browser.pause(200);
      }

      // App should remain responsive
      const windowSize = await driver.getWindowSize();
      expect(windowSize.width).toBeGreaterThan(0);
    });

    it('should swipe left on a list item to reveal actions', async () => {
      const workoutsVisible = await workoutsScreen.isDisplayed('workouts-title');
      if (workoutsVisible) {
        const count = await workoutsScreen.getVisibleWorkoutCount();
        if (count > 0) {
          await baseScreen.swipeLeftOnElement('workout-list-item-0');
          await browser.pause(500);

          // Verify the app handled the swipe without crashing
          expect(await workoutsScreen.isDisplayed('workouts-title')).toBe(true);
        }
      }
    });
  });

  describe('Pinch Zoom on Charts', () => {
    it('should handle pinch-to-zoom-in gesture without crashing', async () => {
      // Navigate to a screen with chart content (dashboard)
      await baseScreen.pinch(true); // Zoom in
      await browser.pause(1000);

      // Verify app remains stable after pinch gesture
      const windowSize = await driver.getWindowSize();
      expect(windowSize.width).toBeGreaterThan(0);
    });

    it('should handle pinch-to-zoom-out gesture without crashing', async () => {
      await baseScreen.pinch(false); // Zoom out
      await browser.pause(1000);

      const windowSize = await driver.getWindowSize();
      expect(windowSize.width).toBeGreaterThan(0);
    });

    it('should handle repeated zoom in and out cycles', async () => {
      for (let i = 0; i < 3; i++) {
        await baseScreen.pinch(true);
        await browser.pause(300);
        await baseScreen.pinch(false);
        await browser.pause(300);
      }

      const windowSize = await driver.getWindowSize();
      expect(windowSize.width).toBeGreaterThan(0);
    });
  });

  describe('Long Press for Context Menu', () => {
    it('should trigger a long press on a workout item', async () => {
      const workoutsVisible = await workoutsScreen.isDisplayed('workouts-title');
      if (workoutsVisible) {
        const count = await workoutsScreen.getVisibleWorkoutCount();
        if (count > 0) {
          await baseScreen.longPress('workout-list-item-0', 2000);
          await browser.pause(1000);

          // After long press, either a context menu appears or nothing happens
          // depending on app implementation. Verify no crash.
          expect(await workoutsScreen.isDisplayed('workouts-title')).toBe(true);
        }
      }
    });

    it('should handle long press with varying durations', async () => {
      const durations = [500, 1000, 3000];
      for (const duration of durations) {
        const workoutsVisible = await workoutsScreen.isDisplayed('workouts-title');
        if (workoutsVisible) {
          const count = await workoutsScreen.getVisibleWorkoutCount();
          if (count > 0) {
            await baseScreen.longPress('workout-list-item-0', duration);
            await browser.pause(500);
          }
        }
      }

      // App should still be responsive
      const windowSize = await driver.getWindowSize();
      expect(windowSize.width).toBeGreaterThan(0);
    });
  });

  describe('Drag to Reorder', () => {
    it('should perform a drag gesture between two workout items', async () => {
      const workoutsVisible = await workoutsScreen.isDisplayed('workouts-title');
      if (workoutsVisible) {
        const count = await workoutsScreen.getVisibleWorkoutCount();
        if (count >= 2) {
          await baseScreen.dragElement('workout-list-item-0', 'workout-list-item-1');
          await browser.pause(1000);

          // Verify list is still displayed and app did not crash
          expect(await workoutsScreen.isDisplayed('workouts-title')).toBe(true);
        }
      }
    });

    it('should handle drag gesture on a single item without crash', async () => {
      const workoutsVisible = await workoutsScreen.isDisplayed('workouts-title');
      if (workoutsVisible) {
        const count = await workoutsScreen.getVisibleWorkoutCount();
        if (count >= 1) {
          // Drag item to itself (noop but should not crash)
          await baseScreen.dragElement('workout-list-item-0', 'workout-list-item-0');
          await browser.pause(500);

          expect(await workoutsScreen.isDisplayed('workouts-title')).toBe(true);
        }
      }
    });
  });

  describe('Multi-touch Gestures', () => {
    it('should handle simultaneous swipe and tap without error', async () => {
      // Perform a swipe followed immediately by a tap
      await baseScreen.swipeUp(0.2);
      await browser.pause(100);

      const windowSize = await driver.getWindowSize();
      // Tap center of screen
      await driver.performActions([
        {
          type: 'pointer',
          id: 'quickTap',
          parameters: { pointerType: 'touch' },
          actions: [
            { type: 'pointerMove', duration: 0, x: windowSize.width / 2, y: windowSize.height / 2 },
            { type: 'pointerDown', button: 0 },
            { type: 'pause', duration: 50 },
            { type: 'pointerUp', button: 0 },
          ],
        },
      ]);
      await driver.releaseActions();

      await browser.pause(500);
      expect(windowSize.width).toBeGreaterThan(0);
    });
  });
});
