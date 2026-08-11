import type { CapacitorConfig } from '@capacitor/cli';

/**
 * MOBILE_E2E=1 relaxes the WebView's transport rules so the app can reach the
 * host-side mock API from inside an emulator. It is set only by the Appium
 * suite (see tests/e2e-mobile/wdio.conf.ts and the mobile-regression job); a
 * plain `npm run build` / `npx cap sync` still produces the hardened default.
 *
 * The relaxations are gated rather than committed unconditionally because both
 * of them genuinely weaken the app:
 *
 *  - `cleartext` sets android:usesCleartextTraffic. Android 9+ blocks plain
 *    HTTP by default, and the mock API only speaks HTTP.
 *  - `allowMixedContent` lets the WebView load http:// subresources into a
 *    page served over https://. Capacitor serves the app from
 *    `https://localhost` (androidScheme below), so every call to the mock is
 *    mixed content. Chromium exempts http://localhost as a "potentially
 *    trustworthy" origin, and the suite reaches the mock over `adb reverse`
 *    precisely so the URL stays localhost — but the flag removes any
 *    dependence on that exemption holding in the WebView.
 *
 * androidScheme stays 'https' deliberately. Downgrading it to 'http' would
 * sidestep mixed content but changes the app's origin (and therefore its
 * storage partition and secure-context status) away from what ships.
 */
const isMobileE2E = process.env.MOBILE_E2E === '1';

const config: CapacitorConfig = {
  appId: 'com.qaframework.fitnesstracker',
  appName: 'Fitness Tracker',
  webDir: 'dist/fitness-tracker/browser',
  server: {
    androidScheme: 'https',
    ...(isMobileE2E ? { cleartext: true } : {}),
  },
  android: {
    ...(isMobileE2E ? { allowMixedContent: true } : {}),
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
  },
};

export default config;
