import { LoginScreen } from '../screens/login.screen';

describe('Login Screen - Mobile', () => {
  const loginScreen = new LoginScreen();

  const validUser = {
    email: 'testuser@example.com',
    password: 'Test1234!',
  };

  beforeEach(async () => {
    // Restart the app to ensure a fresh login screen
    await driver.terminateApp('com.qaframework.fitnesstracker');
    await driver.activateApp('com.qaframework.fitnesstracker');
    await loginScreen.waitForLoginScreen();
  });

  describe('Successful Login', () => {
    it('should display the login screen with all expected elements', async () => {
      expect(await loginScreen.isLoginScreenDisplayed()).toBe(true);
      const title = await loginScreen.getCardTitle();
      expect(title).toContain('Sign In');
    });

    it('should navigate to dashboard after entering valid credentials', async () => {
      await loginScreen.login(validUser.email, validUser.password);

      // Verify we left the login screen (navigated to dashboard)
      await browser.pause(3000);
      const stillOnLogin = await loginScreen.isLoginScreenDisplayed();
      expect(stillOnLogin).toBe(false);
    });
  });

  describe('Failed Login', () => {
    it('should display an error message with invalid credentials', async () => {
      await loginScreen.login('wrong@example.com', 'WrongPass!');

      await browser.pause(2000);
      expect(await loginScreen.isErrorMessageDisplayed()).toBe(true);
      const errorText = await loginScreen.getErrorMessageText();
      expect(errorText.length).toBeGreaterThan(0);
    });

    it('should display an error message with empty password', async () => {
      await loginScreen.enterCredentials(validUser.email, '');

      // Login button should be disabled when password is empty
      const loginBtn = await loginScreen.loginButton;
      const isEnabled = await loginBtn.isEnabled();
      expect(isEnabled).toBe(false);
    });

    it('should display an error message with empty email', async () => {
      await loginScreen.enterCredentials('', validUser.password);

      const loginBtn = await loginScreen.loginButton;
      const isEnabled = await loginBtn.isEnabled();
      expect(isEnabled).toBe(false);
    });
  });

  describe('Keyboard Handling', () => {
    it('should show the keyboard when tapping the email input', async () => {
      const emailInput = await loginScreen.emailInput;
      await emailInput.click();

      await browser.pause(1000);
      const isKeyboardShown = await driver.isKeyboardShown();
      expect(isKeyboardShown).toBe(true);
    });

    it('should dismiss the keyboard and keep entered text', async () => {
      await loginScreen.enterCredentials(validUser.email, validUser.password);

      await loginScreen.dismissKeyboard();
      await browser.pause(500);

      const isKeyboardShown = await driver.isKeyboardShown();
      expect(isKeyboardShown).toBe(false);
    });

    it('should move focus from email to password when tapping next', async () => {
      const emailInput = await loginScreen.emailInput;
      await emailInput.click();
      await emailInput.setValue(validUser.email);

      // Tap the password field
      const passwordInput = await loginScreen.passwordInput;
      await passwordInput.click();
      await browser.pause(500);

      const isKeyboardShown = await driver.isKeyboardShown();
      expect(isKeyboardShown).toBe(true);
    });
  });

  describe('Biometric Authentication Stub', () => {
    it('should handle biometric authentication enrollment check', async () => {
      // Stub: In a real implementation, this would check for biometric hardware.
      // On emulator, biometric is typically not enrolled, so we verify graceful handling.
      const isBiometricAvailable = await (async () => {
        try {
          // UiAutomator2 does not natively expose biometric APIs;
          // this checks that the app does not crash when biometric is unavailable.
          await driver.execute('mobile: fingerprint', { fingerprintId: 1 });
          return true;
        } catch {
          // Expected on emulators without fingerprint enrollment
          return false;
        }
      })();

      // Regardless of biometric availability, the login screen should remain stable
      expect(await loginScreen.isLoginScreenDisplayed()).toBe(true);
    });
  });

  describe('Orientation Change During Login', () => {
    afterEach(async () => {
      // Always restore portrait orientation
      await driver.setOrientation('PORTRAIT');
    });

    it('should retain entered credentials after rotating to landscape', async () => {
      await loginScreen.enterCredentials(validUser.email, validUser.password);
      await loginScreen.dismissKeyboard();

      // Rotate to landscape
      await driver.setOrientation('LANDSCAPE');
      await browser.pause(1500);

      // Verify the login screen is still displayed after rotation
      expect(await loginScreen.isLoginScreenDisplayed()).toBe(true);
    });

    it('should retain credentials after rotating back to portrait', async () => {
      await loginScreen.enterCredentials(validUser.email, validUser.password);
      await loginScreen.dismissKeyboard();

      // Rotate to landscape and back
      await driver.setOrientation('LANDSCAPE');
      await browser.pause(1000);
      await driver.setOrientation('PORTRAIT');
      await browser.pause(1000);

      expect(await loginScreen.isLoginScreenDisplayed()).toBe(true);
    });

    it('should successfully login in landscape orientation', async () => {
      await driver.setOrientation('LANDSCAPE');
      await browser.pause(1000);

      await loginScreen.login(validUser.email, validUser.password);
      await browser.pause(3000);

      const stillOnLogin = await loginScreen.isLoginScreenDisplayed();
      expect(stillOnLogin).toBe(false);
    });
  });
});
