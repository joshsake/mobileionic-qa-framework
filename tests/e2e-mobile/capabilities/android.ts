import path from 'path';

/**
 * Android emulator capabilities for local Appium testing.
 * Targets Pixel 6 emulator with API 33 (Android 13).
 *
 * The template-literal index signature permits any `appium:*` vendor key (e.g.
 * `appium:avd`); the base WebdriverIO.Capabilities type only declares a subset,
 * so without it a valid vendor capability is a compile error.
 */
type AndroidCapabilities = WebdriverIO.Capabilities & Record<`appium:${string}`, unknown>;

export const androidCapabilities: AndroidCapabilities = {
  platformName: 'Android',
  'appium:automationName': 'UiAutomator2',
  'appium:deviceName': 'Android Emulator',
  // No 'appium:avd' and no pinned platformVersion: Appium attaches to whatever
  // device adb already shows. CI boots the emulator itself (the
  // android-emulator-runner names its AVD "test", not "Pixel_6_API_33"), and
  // locally you boot an emulator first — naming a specific AVD here would make
  // Appium try to manage one that isn't running.
  'appium:app': path.resolve(
    __dirname,
    '../../../app/android/app/build/outputs/apk/debug/app-debug.apk'
  ),
  'appium:appPackage': 'com.qaframework.fitnesstracker',
  'appium:appActivity': 'com.qaframework.fitnesstracker.MainActivity',
  'appium:noReset': false,
  'appium:fullReset': false,
  'appium:autoGrantPermissions': true,
  'appium:newCommandTimeout': 300,
  'appium:adbExecTimeout': 60000,
  'appium:uiautomator2ServerInstallTimeout': 60000,
  'appium:uiautomator2ServerLaunchTimeout': 60000,
  'appium:skipServerInstallation': false,
  'appium:ensureWebviewsHavePages': true,
  'appium:nativeWebScreenshot': true,
  'appium:chromedriverAutodownload': true,
};
