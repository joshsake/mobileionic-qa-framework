# Device Compatibility Matrix — Fitness Tracker

## 1. Target Android Devices

| Device | OS Version | Screen Size | Resolution | Priority | CI Emulator | BrowserStack |
|--------|-----------|-------------|------------|----------|-------------|--------------|
| Google Pixel 6 | Android 13 (API 33) | 6.4" | 1080x2400 | P1 | Yes | Yes |
| Google Pixel 7 | Android 13-14 (API 33-34) | 6.3" | 1080x2400 | P1 | Yes | Yes |
| Google Pixel 8 | Android 14 (API 34) | 6.2" | 1080x2400 | P2 | Yes | Yes |
| Samsung Galaxy S23 | Android 13 (API 33) | 6.1" | 1080x2340 | P1 | No | Yes |
| Samsung Galaxy S24 | Android 14 (API 34) | 6.2" | 1080x2340 | P2 | No | Yes |
| Samsung Galaxy S23 Ultra | Android 13 (API 33) | 6.8" | 1440x3088 | P3 | No | Yes |
| Samsung Galaxy A54 | Android 13 (API 33) | 6.4" | 1080x2340 | P3 | No | Yes |
| OnePlus 11 | Android 13 (API 33) | 6.7" | 1440x3216 | P3 | No | Yes |

## 2. Target iOS Devices

| Device | OS Version | Screen Size | Resolution | Priority | Simulator | BrowserStack |
|--------|-----------|-------------|------------|----------|-----------|--------------|
| iPhone 15 | iOS 17 | 6.1" | 1179x2556 | P1 | Yes | Yes |
| iPhone 15 Pro | iOS 17 | 6.1" | 1179x2556 | P1 | Yes | Yes |
| iPhone 14 | iOS 16-17 | 6.1" | 1170x2532 | P1 | Yes | Yes |
| iPhone 14 Pro Max | iOS 16-17 | 6.7" | 1290x2796 | P2 | Yes | Yes |
| iPhone SE (3rd gen) | iOS 16-17 | 4.7" | 750x1334 | P2 | Yes | Yes |
| iPad Air (5th gen) | iOS 16-17 | 10.9" | 1640x2360 | P3 | Yes | Yes |
| iPad Pro 12.9" (6th gen) | iPadOS 16-17 | 12.9" | 2048x2732 | P3 | Yes | Yes |

## 3. OS Version Coverage

### Android
| OS Version | API Level | Market Share (Approx.) | Priority | Notes |
|-----------|-----------|----------------------|----------|-------|
| Android 14 | API 34 | ~25% | P1 | Latest stable release |
| Android 13 | API 33 | ~30% | P1 | Primary CI target |
| Android 12 | API 31-32 | ~20% | P2 | Nightly regression only |
| Android 11 | API 30 | ~12% | P3 | Quarterly validation |

### iOS
| OS Version | Market Share (Approx.) | Priority | Notes |
|-----------|----------------------|----------|-------|
| iOS 17 | ~60% | P1 | Primary target |
| iOS 16 | ~30% | P1 | Nightly regression |
| iOS 15 | ~8% | P3 | Quarterly validation only |

## 4. Browser Coverage (Web/PWA)

| Browser | Version | Platform | Priority | CI Matrix |
|---------|---------|----------|----------|-----------|
| Chrome | Latest | Windows, macOS, Android | P1 | Yes |
| Chrome | Latest - 1 | Windows, macOS, Android | P2 | Nightly |
| Safari | Latest | macOS, iOS | P1 | Yes (WebKit) |
| Safari | Latest - 1 | macOS, iOS | P2 | Nightly |
| Firefox | Latest | Windows, macOS | P1 | Yes |
| Firefox | Latest - 1 | Windows, macOS | P2 | Nightly |
| Edge | Latest | Windows | P2 | Nightly |
| Samsung Internet | Latest | Samsung devices | P3 | BrowserStack only |

## 5. Priority Tier Definitions

### P1 — Must Test (Every PR + Nightly)
- Represents the core user base (~70% of traffic).
- All critical user flows must pass on P1 devices before any release.
- Failures on P1 devices are S1/S2 severity by default.
- Devices: Pixel 6, Pixel 7, Galaxy S23, iPhone 14, iPhone 15.
- Browsers: Chrome Latest, Safari Latest, Firefox Latest.

### P2 — Should Test (Nightly + Release Candidate)
- Represents an additional ~20% of the user base.
- Failures are S2/S3 severity depending on the issue.
- Devices: Pixel 8, Galaxy S24, iPhone 14 Pro Max, iPhone SE.
- Browsers: Chrome Latest-1, Safari Latest-1, Firefox Latest-1, Edge Latest.

### P3 — Nice to Have (Release Candidate + Quarterly)
- Represents edge cases and long-tail devices (~10% of traffic).
- Failures are S3/S4 severity unless they indicate a systemic issue.
- Devices: Galaxy S23 Ultra, Galaxy A54, OnePlus 11, iPads.
- Browsers: Samsung Internet.

## 6. Screen Size Breakpoints

The Ionic app uses responsive layouts. Tests validate correct rendering at these breakpoints:

| Breakpoint | Width | Target Use |
|-----------|-------|-----------|
| Small phone | 320px | iPhone SE, older Android |
| Standard phone | 375-393px | iPhone 14/15, Pixel |
| Large phone | 412-430px | Galaxy S23/S24, Pixel Pro |
| Small tablet | 768px | iPad Mini |
| Tablet | 1024px | iPad Air |
| Large tablet | 1366px | iPad Pro |

## 7. Network Condition Testing Matrix

| Condition | Download | Upload | Latency | Test Frequency |
|-----------|----------|--------|---------|---------------|
| WiFi (fast) | 30 Mbps | 15 Mbps | 2ms | Every run (default) |
| 4G LTE | 12 Mbps | 6 Mbps | 50ms | Nightly |
| 3G | 1.6 Mbps | 768 Kbps | 300ms | Nightly |
| Slow 3G | 400 Kbps | 400 Kbps | 2000ms | Release candidate |
| Offline | 0 | 0 | N/A | Every run (specific tests) |
| Intermittent | Variable | Variable | Variable | Release candidate |
