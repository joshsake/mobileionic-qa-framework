/**
 * BaseScreen provides mobile-specific helpers shared by every screen object.
 *
 * The app under test is an Ionic/Capacitor hybrid: its UI is a web page running
 * inside an Android WebView, not a tree of native widgets. That single fact
 * drives the whole design here.
 *
 *   - Elements are located with CSS `[data-testid="..."]` selectors and matched
 *     against the DOM, NOT with the `~accessibility-id` strategy. data-testid is
 *     a DOM attribute; UiAutomator2 in the NATIVE_APP context cannot see it, so
 *     the original `~` selectors could never resolve. (This was why every mobile
 *     spec timed out.)
 *   - Element interactions therefore require the driver to be in the WEBVIEW
 *     context. switchToWebview() handles that, and the screen wait methods call
 *     it so a test lands in the right context before touching any element.
 *   - Device-level actions (keyboard, orientation, back button, gestures by
 *     coordinate) are driver commands that operate below the context boundary,
 *     so they are left to the specs to call directly.
 */
export class BaseScreen {
  /** Build a CSS selector for an app data-testid. */
  protected sel(testId: string): string {
    return `[data-testid="${testId}"]`;
  }

  /**
   * Ensure the driver is in the Capacitor WebView context.
   *
   * The webview registers a short time after the app launches, and again after
   * a terminate/relaunch, so this polls getContexts() until a WEBVIEW_* context
   * appears rather than assuming it is ready. It is idempotent — if already in
   * the webview it returns immediately — so screens can call it freely.
   */
  async switchToWebview(timeoutMs = 20000): Promise<void> {
    const start = Date.now();
    let seen: string[] = [];

    while (Date.now() - start < timeoutMs) {
      const contexts = (await driver.getContexts()) as string[];
      seen = contexts.map((c) => c.toString());

      const webview = seen.find((c) => c.includes('WEBVIEW'));
      if (webview) {
        const current = (await driver.getContext())?.toString();
        if (current !== webview) {
          await driver.switchContext(webview);
        }
        return;
      }
      await browser.pause(500);
    }

    throw new Error(
      `No WEBVIEW context registered within ${timeoutMs}ms. Available contexts: ${JSON.stringify(seen)}`
    );
  }

  /** Switch back to the native context for native-only interactions. */
  async switchToNative(): Promise<void> {
    await driver.switchContext('NATIVE_APP');
  }

  /**
   * Wait for a screen to be ready, identified by one of its data-testid elements.
   *
   * Switches into the webview first because this is the entry point every test
   * flow hits before interacting with the page.
   */
  async waitForScreen(testId: string, timeoutMs = 30000): Promise<void> {
    await this.switchToWebview();
    const element = await $(this.sel(testId));
    await element.waitForDisplayed({
      timeout: timeoutMs,
      timeoutMsg: `Screen element "${testId}" did not appear within ${timeoutMs}ms`,
    });
  }

  /**
   * Tap an element identified by its data-testid.
   * Waits for the element to be displayed before tapping.
   */
  async tapElement(testId: string): Promise<void> {
    const element = await $(this.sel(testId));
    await element.waitForDisplayed({ timeout: 15000 });
    await element.click();
  }

  /**
   * Return the innermost editable control for a testid.
   *
   * ion-input / ion-textarea render their native <input>/<textarea> inside the
   * component's (open) shadow root, so setValue on the host never reaches it.
   * Chromedriver CSS does not pierce shadow DOM the way Playwright does, so this
   * queries the shadow root explicitly via shadow$, falling back to a light-DOM
   * child and then the host for non-shadow markup.
   */
  private async editableControl(testId: string): Promise<WebdriverIO.Element> {
    const host = await $(this.sel(testId));
    await host.waitForDisplayed({ timeout: 15000 });

    const shadowInner = await host.shadow$('input, textarea');
    if (await shadowInner.isExisting().catch(() => false)) {
      return shadowInner;
    }

    const lightInner = await host.$('input, textarea');
    if (await lightInner.isExisting().catch(() => false)) {
      return lightInner;
    }

    return host;
  }

  /**
   * Read a boolean attribute the way Ionic reflects it, e.g. `disabled`.
   *
   * WebDriver's "is element enabled" only reports false for native form
   * controls; a custom element like ion-button always reports enabled even when
   * visibly disabled. Ionic reflects the state onto the host attribute, so that
   * is what must be read.
   */
  async hasAttribute(testId: string, attribute: string): Promise<boolean> {
    const host = await $(this.sel(testId));
    await host.waitForDisplayed({ timeout: 15000 });
    const value = await host.getAttribute(attribute);
    return value !== null;
  }

  /**
   * Type text into an input field identified by data-testid.
   * Clears existing content before typing.
   */
  async typeIntoField(testId: string, text: string): Promise<void> {
    const control = await this.editableControl(testId);
    await control.clearValue();
    await control.setValue(text);
  }

  /**
   * Get the text content of an element by its data-testid.
   */
  async getTextById(testId: string): Promise<string> {
    const element = await $(this.sel(testId));
    await element.waitForDisplayed({ timeout: 15000 });
    return element.getText();
  }

  /**
   * Check whether an element is currently displayed. Returns false rather than
   * throwing when the element is absent, so it is safe to use in assertions.
   */
  async isDisplayed(testId: string): Promise<boolean> {
    try {
      const element = await $(this.sel(testId));
      return await element.isDisplayed();
    } catch {
      return false;
    }
  }

  /** Wait for an element to disappear from the screen. */
  async waitForElementGone(testId: string, timeoutMs = 10000): Promise<void> {
    const element = await $(this.sel(testId));
    await element.waitForDisplayed({
      timeout: timeoutMs,
      reverse: true,
      timeoutMsg: `Element "${testId}" did not disappear within ${timeoutMs}ms`,
    });
  }

  /**
   * Long press an element for context menus or special actions.
   *
   * The element is located in the webview (DOM coordinates), then the press is
   * performed via the driver's touch pointer. getElementRect returns viewport
   * coordinates that line up with the native surface because the webview fills
   * the screen; if a future layout adds native chrome above the webview this
   * would need an offset.
   */
  async longPress(testId: string, durationMs = 2000): Promise<void> {
    const element = await $(this.sel(testId));
    await element.waitForDisplayed({ timeout: 15000 });

    const location = await element.getLocation();
    const size = await element.getSize();
    const centerX = Math.round(location.x + size.width / 2);
    const centerY = Math.round(location.y + size.height / 2);

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
   * Scroll the webview content by a fraction of the viewport.
   *
   * Uses in-page JavaScript rather than a native swipe: in the webview context
   * a DOM scroll is deterministic and does not depend on translating native
   * touch coordinates onto scrollable content. Positive fraction scrolls down.
   */
  async scrollByViewport(fraction = 0.6): Promise<void> {
    await browser.execute((f: number) => {
      // Ionic renders its scroll container as ion-content's inner .ion-content
      // (a real scrollable element); fall back to the window.
      const scroller =
        document.querySelector('ion-content')?.shadowRoot?.querySelector('.inner-scroll') ||
        document.scrollingElement ||
        document.body;
      (scroller as Element).scrollBy(0, window.innerHeight * f);
    }, fraction);
    await browser.pause(400);
  }

  /**
   * Scroll down repeatedly until an element is displayed or attempts run out.
   */
  async scrollToElement(testId: string, maxScrolls = 10): Promise<WebdriverIO.Element> {
    for (let i = 0; i < maxScrolls; i++) {
      const element = await $(this.sel(testId));
      if (await element.isDisplayed().catch(() => false)) {
        return element;
      }
      await this.scrollByViewport(0.6);
    }
    throw new Error(`Element "${testId}" not found after ${maxScrolls} scroll attempts`);
  }

  // ─── Coordinate gestures ──────────────────────────────────────────────────
  // These use absolute screen coordinates from the driver window size, so they
  // are independent of the DOM and work the same whether the current context is
  // native or webview.

  /** Swipe up (scroll content down) by a fraction of screen height. */
  async swipeUp(percentage = 0.5): Promise<void> {
    const { width, height } = await driver.getWindowSize();
    const startX = Math.round(width / 2);
    const startY = Math.round(height * 0.8);
    const endY = Math.round(height * (0.8 - percentage * 0.6));
    await this.verticalSwipe(startX, startY, endY);
  }

  /** Swipe down (scroll content up / pull to refresh) by a fraction of height. */
  async swipeDown(percentage = 0.5): Promise<void> {
    const { width, height } = await driver.getWindowSize();
    const startX = Math.round(width / 2);
    const startY = Math.round(height * 0.2);
    const endY = Math.round(height * (0.2 + percentage * 0.6));
    await this.verticalSwipe(startX, startY, endY);
  }

  private async verticalSwipe(x: number, startY: number, endY: number): Promise<void> {
    await driver.performActions([
      {
        type: 'pointer',
        id: 'swipe',
        parameters: { pointerType: 'touch' },
        actions: [
          { type: 'pointerMove', duration: 0, x, y: startY },
          { type: 'pointerDown', button: 0 },
          { type: 'pointerMove', duration: 600, x, y: endY },
          { type: 'pointerUp', button: 0 },
        ],
      },
    ]);
    await driver.releaseActions();
  }

  /**
   * Swipe left across an element (e.g. reveal a sliding delete action).
   *
   * The element is located in the webview; its viewport rect lines up with the
   * native surface because the webview fills the screen.
   */
  async swipeLeftOnElement(testId: string): Promise<void> {
    const element = await $(this.sel(testId));
    await element.waitForDisplayed({ timeout: 15000 });

    const location = await element.getLocation();
    const size = await element.getSize();
    const centerY = Math.round(location.y + size.height / 2);
    const startX = Math.round(location.x + size.width * 0.8);
    const endX = Math.round(location.x + size.width * 0.2);

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
   * Drag one element onto another by their centre points.
   */
  async dragElement(sourceTestId: string, targetTestId: string): Promise<void> {
    const source = await $(this.sel(sourceTestId));
    const target = await $(this.sel(targetTestId));

    const sourceLoc = await source.getLocation();
    const sourceSize = await source.getSize();
    const targetLoc = await target.getLocation();
    const targetSize = await target.getSize();

    const startX = Math.round(sourceLoc.x + sourceSize.width / 2);
    const startY = Math.round(sourceLoc.y + sourceSize.height / 2);
    const endX = Math.round(targetLoc.x + targetSize.width / 2);
    const endY = Math.round(targetLoc.y + targetSize.height / 2);

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

  /**
   * Pinch to zoom in or out at the centre of the screen.
   * @param zoomIn true to spread (zoom in), false to pinch (zoom out).
   */
  async pinch(zoomIn = true): Promise<void> {
    const { width, height } = await driver.getWindowSize();
    const centerX = Math.round(width / 2);
    const centerY = Math.round(height / 2);

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
}
