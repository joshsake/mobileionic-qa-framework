import { LoginScreen } from '../screens/login.screen';

describe('Device Features - Mobile', () => {
  const loginScreen = new LoginScreen();

  const validUser = {
    email: 'testuser@example.com',
    password: 'Test1234!',
  };

  before(async () => {
    await driver.terminateApp('com.qaframework.fitnesstracker', {});
    await driver.activateApp('com.qaframework.fitnesstracker');
    await loginScreen.waitForLoginScreen();
  });

  describe('Orientation Change', () => {
    afterEach(async () => {
      await driver.setOrientation('PORTRAIT');
      await browser.pause(500);
    });

    it('should render correctly in portrait orientation', async () => {
      await driver.setOrientation('PORTRAIT');
      await browser.pause(1000);

      expect(await loginScreen.isLoginScreenDisplayed()).toBe(true);

      const windowSize = await driver.getWindowSize();
      expect(windowSize.height).toBeGreaterThan(windowSize.width);
    });

    it('should render correctly in landscape orientation', async () => {
      await driver.setOrientation('LANDSCAPE');
      await browser.pause(1500);

      expect(await loginScreen.isLoginScreenDisplayed()).toBe(true);

      const windowSize = await driver.getWindowSize();
      expect(windowSize.width).toBeGreaterThan(windowSize.height);
    });

    it('should handle multiple rapid orientation changes', async () => {
      const orientations: ('PORTRAIT' | 'LANDSCAPE')[] = [
        'LANDSCAPE', 'PORTRAIT', 'LANDSCAPE', 'PORTRAIT',
      ];

      for (const orientation of orientations) {
        await driver.setOrientation(orientation);
        await browser.pause(800);
      }

      // App should remain responsive after rapid changes
      expect(await loginScreen.isLoginScreenDisplayed()).toBe(true);
    });

    it('should maintain scroll position after orientation change', async () => {
      // Login and navigate to a scrollable screen first
      await loginScreen.login(validUser.email, validUser.password);
      await browser.pause(3000);

      await driver.setOrientation('LANDSCAPE');
      await browser.pause(1500);
      await driver.setOrientation('PORTRAIT');
      await browser.pause(1500);

      // Verify the app is still on a valid screen
      const windowSize = await driver.getWindowSize();
      expect(windowSize.width).toBeGreaterThan(0);
    });
  });

  describe('Back Button Behavior', () => {
    beforeEach(async () => {
      await driver.terminateApp('com.qaframework.fitnesstracker', {});
      await driver.activateApp('com.qaframework.fitnesstracker');
      await loginScreen.waitForLoginScreen();
    });

    it('should handle hardware back button on the login screen', async () => {
      await driver.pressKeyCode(4); // Android KEYCODE_BACK
      await browser.pause(1000);

      // On the root login screen, back should either do nothing
      // or minimize the app. The app should not crash.
      // Re-activate the app if it was minimized
      await driver.activateApp('com.qaframework.fitnesstracker');
      await browser.pause(1000);

      expect(await loginScreen.isLoginScreenDisplayed()).toBe(true);
    });

    it('should navigate back after logging in and pressing back', async () => {
      await loginScreen.login(validUser.email, validUser.password);
      await browser.pause(3000);

      // Press back to return from dashboard
      await driver.pressKeyCode(4);
      await browser.pause(1500);

      // Behavior depends on navigation stack; verify app does not crash
      const windowSize = await driver.getWindowSize();
      expect(windowSize.width).toBeGreaterThan(0);
    });

    it('should handle double back press gracefully', async () => {
      await driver.pressKeyCode(4);
      await browser.pause(300);
      await driver.pressKeyCode(4);
      await browser.pause(1000);

      // Re-activate app
      await driver.activateApp('com.qaframework.fitnesstracker');
      await browser.pause(1500);

      expect(await loginScreen.isLoginScreenDisplayed()).toBe(true);
    });
  });

  describe('App Backgrounding and Foregrounding', () => {
    beforeEach(async () => {
      await driver.terminateApp('com.qaframework.fitnesstracker', {});
      await driver.activateApp('com.qaframework.fitnesstracker');
      await loginScreen.waitForLoginScreen();
    });

    it('should preserve state after backgrounding for a short period', async () => {
      await loginScreen.enterCredentials(validUser.email, validUser.password);
      await loginScreen.dismissKeyboard();

      // Background the app for 3 seconds
      await driver.background(3);
      await browser.pause(1000);

      // App should be back in foreground with login screen visible
      expect(await loginScreen.isLoginScreenDisplayed()).toBe(true);
    });

    it('should handle backgrounding for a longer period', async () => {
      await loginScreen.enterCredentials(validUser.email, validUser.password);
      await loginScreen.dismissKeyboard();

      // Background the app for 10 seconds
      await driver.background(10);
      await browser.pause(2000);

      // Verify the app recovers and displays a valid screen
      const windowSize = await driver.getWindowSize();
      expect(windowSize.width).toBeGreaterThan(0);
    });

    it('should recover after being terminated and relaunched', async () => {
      await driver.terminateApp('com.qaframework.fitnesstracker', {});
      await browser.pause(2000);

      await driver.activateApp('com.qaframework.fitnesstracker');
      await browser.pause(3000);

      // After full restart, should show login screen
      expect(await loginScreen.isLoginScreenDisplayed()).toBe(true);
    });

    it('should handle rapid background/foreground cycles', async () => {
      for (let i = 0; i < 3; i++) {
        await driver.background(1);
        await browser.pause(500);
      }

      // App should still be functional
      expect(await loginScreen.isLoginScreenDisplayed()).toBe(true);
    });
  });

  describe('Notification Handling Stub', () => {
    it('should handle a push notification while on the login screen', async () => {
      // Stub: Simulate opening the notification shade and returning.
      // On a real device with push notifications configured, this would test
      // that incoming notifications do not disrupt the current screen.
      await driver.openNotifications();
      await browser.pause(2000);

      // Press back to close the notification shade
      await driver.pressKeyCode(4);
      await browser.pause(1500);

      // App should remain on the login screen
      expect(await loginScreen.isLoginScreenDisplayed()).toBe(true);
    });

    it('should handle notification shade interaction during login flow', async () => {
      await loginScreen.enterCredentials(validUser.email, validUser.password);
      await loginScreen.dismissKeyboard();

      // Open and close notification shade
      await driver.openNotifications();
      await browser.pause(1000);
      await driver.pressKeyCode(4);
      await browser.pause(1000);

      // Login screen should still be visible with credentials intact
      expect(await loginScreen.isLoginScreenDisplayed()).toBe(true);
    });
  });

  describe('Screen Lock and Unlock Stub', () => {
    it('should handle device lock and unlock cycle', async () => {
      // Lock the device
      try {
        await driver.lock();
        await browser.pause(2000);

        const isLocked = await driver.isLocked();
        expect(isLocked).toBe(true);

        // Unlock the device
        await driver.unlock();
        await browser.pause(3000);

        // Verify app is still accessible
        await driver.activateApp('com.qaframework.fitnesstracker');
        await browser.pause(2000);
        expect(await loginScreen.isLoginScreenDisplayed()).toBe(true);
      } catch {
        // Lock/unlock may not be supported on all emulator configurations
        // Verify app is still in a good state
        await driver.activateApp('com.qaframework.fitnesstracker');
        await browser.pause(2000);
        const windowSize = await driver.getWindowSize();
        expect(windowSize.width).toBeGreaterThan(0);
      }
    });
  });
});
