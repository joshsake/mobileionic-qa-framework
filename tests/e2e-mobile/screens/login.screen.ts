import { BaseScreen } from './base.screen';

/**
 * LoginScreen encapsulates all interactions with the Fitness Tracker login page.
 * Uses data-testid attributes defined in the Ionic login.page.ts component.
 */
export class LoginScreen extends BaseScreen {
  /** Selectors mapping to data-testid attributes in the app */
  private selectors = {
    loginTitle: 'login-title',
    loginCard: 'login-card',
    cardTitle: 'login-card-title',
    emailInput: 'login-email-input',
    passwordInput: 'login-password-input',
    loginButton: 'login-submit-btn',
    errorMessage: 'login-error-message',
  };

  /**
   * Wait for the login screen to be fully loaded and visible.
   */
  async waitForLoginScreen(): Promise<void> {
    await this.waitForScreen(this.selectors.loginCard);
  }

  /**
   * Get the email input element (the ion-input host).
   *
   * For typing use enterCredentials(), which reaches the inner native <input>;
   * this getter is for presence/tap checks where the host element is correct.
   */
  get emailInput() {
    return $(this.sel(this.selectors.emailInput));
  }

  /**
   * Get the password input element (the ion-input host).
   */
  get passwordInput() {
    return $(this.sel(this.selectors.passwordInput));
  }

  /**
   * Get the login button element.
   */
  get loginButton() {
    return $(this.sel(this.selectors.loginButton));
  }

  /**
   * Get the error message element (visible only on login failure).
   */
  get errorMessage() {
    return $(this.sel(this.selectors.errorMessage));
  }

  /**
   * Enter email and password into the login form fields.
   */
  async enterCredentials(email: string, password: string): Promise<void> {
    await this.typeIntoField(this.selectors.emailInput, email);
    await this.typeIntoField(this.selectors.passwordInput, password);
  }

  /**
   * Tap the login button to submit credentials.
   */
  async tapLogin(): Promise<void> {
    await this.tapElement(this.selectors.loginButton);
  }

  /**
   * Perform a full login flow: enter credentials and tap login.
   */
  async login(email: string, password: string): Promise<void> {
    await this.enterCredentials(email, password);
    await this.tapLogin();
  }

  /**
   * Whether the login button is enabled.
   *
   * Reads the reflected `disabled` attribute rather than isEnabled(), which
   * always reports true for a custom element like ion-button. The app disables
   * the button until both fields are filled ([disabled]="!email || !password").
   */
  async isLoginButtonEnabled(): Promise<boolean> {
    return !(await this.hasAttribute(this.selectors.loginButton, 'disabled'));
  }

  /**
   * Check if the login screen is currently displayed.
   */
  async isLoginScreenDisplayed(): Promise<boolean> {
    return this.isDisplayed(this.selectors.loginCard);
  }

  /**
   * Check if an error message is visible on the login screen.
   */
  async isErrorMessageDisplayed(): Promise<boolean> {
    return this.isDisplayed(this.selectors.errorMessage);
  }

  /**
   * Get the text of the error message.
   */
  async getErrorMessageText(): Promise<string> {
    return this.getTextById(this.selectors.errorMessage);
  }

  /**
   * Get the login card title text.
   */
  async getCardTitle(): Promise<string> {
    return this.getTextById(this.selectors.cardTitle);
  }

  /**
   * Dismiss the keyboard if it is currently displayed.
   */
  async dismissKeyboard(): Promise<void> {
    if (await driver.isKeyboardShown()) {
      await driver.hideKeyboard();
    }
  }
}
