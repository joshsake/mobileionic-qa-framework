import path from 'path';

/**
 * Android emulator capabilities for local Appium testing.
 * Targets Pixel 6 emulator with API 33 (Android 13).
 */
export const androidCapabilities: WebdriverIO.Capabilities = {
  platformName: 'Android',
  'appium:automationName': 'UiAutomator2',
  'appium:deviceName': 'Pixel 6',
  'appium:platformVersion': '13',
  'appium:avd': 'Pixel_6_API_33',
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
