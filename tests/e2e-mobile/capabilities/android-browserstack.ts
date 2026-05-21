/**
 * BrowserStack capabilities template for cloud device farm testing.
 *
 * To use BrowserStack:
 * 1. Set BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY environment variables
 * 2. Upload your APK to BrowserStack and update the app URL below
 * 3. Run: BROWSERSTACK=true npx wdio run ./wdio.conf.ts
 */

// const BROWSERSTACK_APP_URL = 'bs://<app-hash-from-upload>';
//
// export const browserstackCapabilities: WebdriverIO.Capabilities = {
//   platformName: 'Android',
//   'appium:automationName': 'UiAutomator2',
//   'appium:deviceName': 'Samsung Galaxy S23',
//   'appium:platformVersion': '13.0',
//   'appium:app': BROWSERSTACK_APP_URL,
//   'appium:noReset': false,
//   'appium:autoGrantPermissions': true,
//
//   // BrowserStack-specific capabilities
//   'bstack:options': {
//     userName: process.env.BROWSERSTACK_USERNAME || '',
//     accessKey: process.env.BROWSERSTACK_ACCESS_KEY || '',
//     projectName: 'Fitness Tracker QA',
//     buildName: `Build ${process.env.BUILD_NUMBER || 'local'}`,
//     sessionName: 'Android Regression',
//     debug: true,
//     networkLogs: true,
//     video: true,
//     appiumVersion: '2.4.1',
//     idleTimeout: 300,
//
//     // Device farm matrix for extended regression
//     // Uncomment additional entries to run across multiple devices
//     // deviceName: 'Samsung Galaxy S24',
//     // platformVersion: '14.0',
//
//     // deviceName: 'Google Pixel 8',
//     // platformVersion: '14.0',
//
//     // deviceName: 'Samsung Galaxy S23 Ultra',
//     // platformVersion: '13.0',
//   },
// };
//
// /**
//  * BrowserStack hub URL.
//  * Use this as the hostname in wdio.conf.ts when running on BrowserStack.
//  */
// export const BROWSERSTACK_HUB = 'hub.browserstack.com';
// export const BROWSERSTACK_PORT = 443;
// export const BROWSERSTACK_PATH = '/wd/hub';
