/**
 * BaseScreen provides mobile-specific helper methods for all screen objects.
 * Uses accessibility IDs and UiAutomator2 selectors for reliable element location.
 */
export class BaseScreen {
  /**
   * Wait for a screen to be fully loaded by checking a key element.
   * @param selector - Accessibility ID or selector for the screen's identifying element.
   * @param timeoutMs - Maximum wait time in milliseconds.
   */
  async waitForScreen(selector: string, timeoutMs = 30000): Promise<void> {
    const element = await $(`~${selector}`);
    await element.waitForDisplayed({
      timeout: timeoutMs,
      timeoutMsg: `Screen with element "${selector}" did not appear within ${timeoutMs}ms`,
    });
  }

  /**
   * Tap an element identified by its accessibility ID.
   * Waits for the element to be displayed before tapping.
   */
  async tapElement(accessibilityId: string): Promise<void> {
    const element = await $(`~${accessibilityId}`);
    await element.waitForDisplayed({ timeout: 15000 });
    await element.click();
  }

  /**
   * Long press an element for context menus or special actions.
   * @param accessibilityId - The accessibility ID of the target element.
   * @param durationMs - How long to hold the press in milliseconds.
   */
  async longPress(accessibilityId: string, durationMs = 2000): Promise<void> {
    const element = await $(`~${accessibilityId}`);
    await element.waitForDisplayed({ timeout: 15000 });

    const location = await element.getLocation();
    const size = await element.getSize();
    const centerX = location.x + size.width / 2;
    const centerY = location.y + size.height / 2;

    await driver.performActions([
      {
        type: 'pointer',
        id: 'longpress',
        parameters: { pointerType: 'touch' },
        actions: [
          { type: 'pointerMove', duration: 0, x: centerX, y: centerY },
          { type: 'pointerDown', button: 0 },
          { type: 'pause', duration: durationMs },
          { type: 'pointerUp', button: 0 },
        ],
      },
    ]);
    await driver.releaseActions();
  }

  /**
   * Swipe up on the screen (scroll down through content).
   * @param percentage - How much of the screen height to swipe (0.0 to 1.0).
   */
  async swipeUp(percentage = 0.5): Promise<void> {
    const { width, height } = await driver.getWindowSize();
    const startX = width / 2;
    const startY = height * 0.8;
    const endY = height * (0.8 - percentage * 0.6);

    await driver.performActions([
      {
        type: 'pointer',
        id: 'swipeUp',
        parameters: { pointerType: 'touch' },
        actions: [
          { type: 'pointerMove', duration: 0, x: startX, y: startY },
          { type: 'pointerDown', button: 0 },
          { type: 'pointerMove', duration: 600, x: startX, y: endY },
          { type: 'pointerUp', button: 0 },
        ],
      },
    ]);
    await driver.releaseActions();
  }

  /**
   * Swipe down on the screen (scroll up through content or pull to refresh).
   * @param percentage - How much of the screen height to swipe (0.0 to 1.0).
   */
  async swipeDown(percentage = 0.5): Promise<void> {
    const { width, height } = await driver.getWindowSize();
    const startX = width / 2;
    const startY = height * 0.2;
    const endY = height * (0.2 + percentage * 0.6);

    await driver.performActions([
      {
        type: 'pointer',
        id: 'swipeDown',
        parameters: { pointerType: 'touch' },
        actions: [
          { type: 'pointerMove', duration: 0, x: startX, y: startY },
          { type: 'pointerDown', button: 0 },
          { type: 'pointerMove', duration: 600, x: startX, y: endY },
          { type: 'pointerUp', button: 0 },
        ],
      },
    ]);
    await driver.releaseActions();
  }

  /**
   * Swipe left on a specific element (e.g., swipe to delete).
   */
  async swipeLeftOnElement(accessibilityId: string): Promise<void> {
    const element = await $(`~${accessibilityId}`);
    await element.waitForDisplayed({ timeout: 15000 });

    const location = await element.getLocation();
    const size = await element.getSize();
    const centerY = location.y + size.height / 2;
    const startX = location.x + size.width * 0.8;
    const endX = location.x + size.width * 0.2;

    await driver.performActions([
      {
        type: 'pointer',
        id: 'swipeLeft',
        parameters: { pointerType: 'touch' },
        actions: [
          { type: 'pointerMove', duration: 0, x: startX, y: centerY },
          { type: 'pointerDown', button: 0 },
          { type: 'pointerMove', duration: 400, x: endX, y: centerY },
          { type: 'pointerUp', button: 0 },
        ],
      },
    ]);
    await driver.releaseActions();
  }

  /**
   * Scroll to find an element that may be off-screen.
   * Performs repeated swipe-up gestures until the element is found or max attempts reached.
   */
  async scrollToElement(accessibilityId: string, maxScrolls = 10): Promise<WebdriverIO.Element> {
    for (let i = 0; i < maxScrolls; i++) {
      const element = await $(`~${accessibilityId}`);
      if (await element.isDisplayed()) {
        return element;
      }
      await this.swipeUp(0.3);
    }
    throw new Error(
      `Element with accessibility ID "${accessibilityId}" not found after ${maxScrolls} scroll attempts`
    );
  }

  /**
   * Check if an element is currently displayed on screen.
   */
  async isDisplayed(accessibilityId: string): Promise<boolean> {
    try {
      const element = await $(`~${accessibilityId}`);
      return await element.isDisplayed();
    } catch {
      return false;
    }
  }

  /**
   * Get the text content of an element by its accessibility ID.
   */
  async getTextById(accessibilityId: string): Promise<string> {
    const element = await $(`~${accessibilityId}`);
    await element.waitForDisplayed({ timeout: 15000 });
    return element.getText();
  }

  /**
   * Type text into an input field identified by accessibility ID.
   * Clears existing content before typing.
   */
  async typeIntoField(accessibilityId: string, text: string): Promise<void> {
    const element = await $(`~${accessibilityId}`);
    await element.waitForDisplayed({ timeout: 15000 });
    await element.clearValue();
    await element.setValue(text);
  }

  /**
   * Wait for an element to disappear from the screen.
   */
  async waitForElementGone(accessibilityId: string, timeoutMs = 10000): Promise<void> {
    const element = await $(`~${accessibilityId}`);
    await element.waitForDisplayed({
      timeout: timeoutMs,
      reverse: true,
      timeoutMsg: `Element "${accessibilityId}" did not disappear within ${timeoutMs}ms`,
    });
  }

  /**
   * Pinch gesture (zoom in or out) at center of screen.
   * @param zoomIn - true to zoom in (spread), false to zoom out (pinch).
   */
  async pinch(zoomIn = true): Promise<void> {
    const { width, height } = await driver.getWindowSize();
    const centerX = width / 2;
    const centerY = height / 2;
    const offset = zoomIn ? 100 : -100;

    await driver.performActions([
      {
        type: 'pointer',
        id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
          { type: 'pointerMove', duration: 0, x: centerX - (zoomIn ? 20 : 120), y: centerY },
          { type: 'pointerDown', button: 0 },
          { type: 'pointerMove', duration: 500, x: centerX - (zoomIn ? 120 : 20), y: centerY },
          { type: 'pointerUp', button: 0 },
        ],
      },
      {
        type: 'pointer',
        id: 'finger2',
        parameters: { pointerType: 'touch' },
        actions: [
          { type: 'pointerMove', duration: 0, x: centerX + (zoomIn ? 20 : 120), y: centerY },
          { type: 'pointerDown', button: 0 },
          { type: 'pointerMove', duration: 500, x: centerX + (zoomIn ? 120 : 20), y: centerY },
          { type: 'pointerUp', button: 0 },
        ],
      },
    ]);
    await driver.releaseActions();
  }

  /**
   * Drag an element from one position to another.
   */
  async dragElement(
    sourceAccessibilityId: string,
    targetAccessibilityId: string
  ): Promise<void> {
    const source = await $(`~${sourceAccessibilityId}`);
    const target = await $(`~${targetAccessibilityId}`);

    const sourceLoc = await source.getLocation();
    const sourceSize = await source.getSize();
    const targetLoc = await target.getLocation();
    const targetSize = await target.getSize();

    const startX = sourceLoc.x + sourceSize.width / 2;
    const startY = sourceLoc.y + sourceSize.height / 2;
    const endX = targetLoc.x + targetSize.width / 2;
    const endY = targetLoc.y + targetSize.height / 2;

    await driver.performActions([
      {
        type: 'pointer',
        id: 'drag',
        parameters: { pointerType: 'touch' },
        actions: [
          { type: 'pointerMove', duration: 0, x: startX, y: startY },
          { type: 'pointerDown', button: 0 },
          { type: 'pause', duration: 500 },
          { type: 'pointerMove', duration: 800, x: endX, y: endY },
          { type: 'pointerUp', button: 0 },
        ],
      },
    ]);
    await driver.releaseActions();
  }
}
