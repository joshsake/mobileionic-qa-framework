# Defect Taxonomy — Fitness Tracker QA

## 1. Severity Levels

### S1 — Critical
Complete failure of core functionality, data loss, security breach, or application crash affecting all users.

**General examples:**
- Application crashes on launch.
- User data is deleted or corrupted without user action.
- Authentication bypass allowing unauthorized access.
- API returns sensitive data (tokens, passwords) in error responses.

**Mobile-specific examples:**
- App crashes when rotating from portrait to landscape during login.
- App crashes on Android 13+ when returning from background after 30+ seconds.
- Workout data lost when the app is terminated by the OS during a save operation.
- Touch input becomes unresponsive after a series of rapid gesture interactions.

### S2 — Major
Feature is significantly impaired but the app remains usable. Major UX degradation or performance regression that affects a large portion of users.

**General examples:**
- Login fails intermittently (1 in 10 attempts).
- Workout list does not refresh after adding a new workout.
- API response time exceeds 2 seconds under normal load.
- Form validation allows invalid data to be submitted.

**Mobile-specific examples:**
- Keyboard covers the login button and there is no way to scroll to it on small screen devices.
- Pull-to-refresh animation plays but data does not actually update.
- Swipe-to-delete gesture registers as a tap, opening the workout detail instead.
- App does not restore state after being backgrounded for more than 60 seconds on specific Android OEM skins.

### S3 — Minor
Feature works but with minor issues. Cosmetic problems, edge case failures, or UX inconsistencies that do not block core workflows.

**General examples:**
- Date format displays inconsistently between list and detail views.
- Empty state message has a grammatical error.
- Loading spinner persists for 1 second after data has loaded.
- Non-critical API field missing from response (e.g., optional notes field).

**Mobile-specific examples:**
- Workout list item text truncated on devices with smaller screens (iPhone SE) but still readable.
- FAB button slightly overlaps the last list item on landscape orientation.
- Animation stutter during pull-to-refresh on older Android devices.
- Status bar color does not match the toolbar color on Android 12.

### S4 — Trivial
Cosmetic-only issues with negligible user impact. Typically deferred to future sprints.

**General examples:**
- Font weight differs slightly from design mockup.
- 1-pixel misalignment between adjacent elements.
- Console log statement left in production code.
- API returns an extra unused field in JSON response.

**Mobile-specific examples:**
- Splash screen displays for 50ms longer than specified.
- Ripple effect color on Android button is slightly different shade.
- Minor spacing difference between iOS and Android renders.
- App icon has 1-pixel border artifact on certain launcher themes.

## 2. Defect Categories

### UI / Visual
Issues related to the visual presentation of the application.

- **Layout**: Element positioning, spacing, alignment, overflow.
- **Typography**: Font family, size, weight, color, truncation.
- **Color/Theme**: Incorrect colors, dark mode issues, contrast problems.
- **Animation**: Jank, missing transitions, stuck animations.
- **Responsive**: Breakpoint failures, improper scaling, viewport issues.

### Functional
Issues where the application does not behave as specified.

- **Data Integrity**: Incorrect data displayed, data not saved, data lost.
- **Navigation**: Incorrect routing, broken back button, dead ends.
- **Business Logic**: Calculation errors, incorrect validation, wrong filtering.
- **State Management**: Stale data, race conditions, incorrect state transitions.
- **Error Handling**: Missing error messages, incorrect error recovery, silent failures.

### Performance
Issues related to application speed, resource usage, or scalability.

- **Response Time**: API latency exceeding thresholds.
- **Rendering**: Slow UI rendering, frame drops, jank during scrolling.
- **Memory**: Memory leaks, excessive memory consumption, OOM crashes.
- **Battery**: Excessive battery drain from background processes or polling.
- **Network**: Excessive API calls, large payload sizes, missing caching.

### Security
Issues that could compromise user data or system integrity.

- **Authentication**: Token leaks, session fixation, credential exposure.
- **Authorization**: Privilege escalation, accessing other users' data.
- **Data Exposure**: Sensitive data in logs, URLs, or error messages.
- **Input Validation**: SQL injection, XSS, command injection vectors.
- **Transport**: Insecure HTTP connections, certificate validation failures.

### Accessibility
Issues that prevent users with disabilities from using the application.

- **Screen Reader**: Missing labels, incorrect reading order, unlabeled buttons.
- **Keyboard Navigation**: Focus trapping, unreachable elements, no focus indicators.
- **Color Contrast**: Insufficient contrast ratios (WCAG AA requires 4.5:1).
- **Touch Target**: Interactive elements smaller than 44x44 points (iOS) or 48x48 dp (Android).
- **Motion**: No reduced motion support, auto-playing animations without controls.

### Platform-Specific
Issues that manifest only on certain platforms, devices, or OS versions.

- **Android-Only**: Issues specific to Android rendering engine, OEM customizations, or UiAutomator2 interactions.
- **iOS-Only**: Issues specific to WebKit rendering, iOS gesture system, or safe area handling.
- **Device-Specific**: Issues on particular hardware (e.g., Samsung One UI quirks, Pixel-specific camera APIs).
- **OS Version-Specific**: Issues appearing only on certain API levels or iOS versions.
- **Browser-Specific**: Issues in Chrome vs. Firefox vs. Safari web rendering.

## 3. Bug Report Template

When filing a defect, use the following template to ensure all necessary information is captured.

```
### Title
[Category] Brief description of the defect

### Severity
S1 / S2 / S3 / S4

### Category
UI | Functional | Performance | Security | Accessibility | Platform-Specific

### Environment
- **Device**: [e.g., Pixel 6, iPhone 15, Chrome Desktop]
- **OS Version**: [e.g., Android 13 (API 33), iOS 17.2]
- **App Version**: [e.g., 1.2.0 build 45]
- **Browser** (if web): [e.g., Chrome 120, Safari 17.2]
- **Network**: [e.g., WiFi, 4G, Offline]
- **Orientation**: [Portrait / Landscape / Both]

### Steps to Reproduce
1. [First step]
2. [Second step]
3. [Third step]

### Expected Behavior
[What should happen]

### Actual Behavior
[What actually happens]

### Frequency
[Always / Intermittent (X out of Y attempts) / One-time]

### Screenshots / Video
[Attach screenshots, screen recording, or Appium failure screenshots]

### Logs
[Relevant console logs, Appium logs, or API response bodies]

### Workaround
[If any workaround exists, describe it here]

### Additional Context
[Any other relevant information: related issues, regression info, etc.]
```

## 4. Defect Lifecycle

```
New --> Triaged --> In Progress --> In Review --> Verified --> Closed
                        |                            |
                        v                            v
                    Won't Fix                    Reopened
                    Deferred
                    Duplicate
```

### State Definitions

| State | Description | Owner |
|-------|-------------|-------|
| **New** | Defect has been filed but not yet reviewed | Reporter |
| **Triaged** | QA lead has assigned severity, priority, and category | QA Lead |
| **In Progress** | Developer is actively working on a fix | Developer |
| **In Review** | Fix is in code review / PR | Developer + Reviewer |
| **Verified** | QA has confirmed the fix resolves the issue | QA |
| **Closed** | Fix is deployed and verified in staging/production | QA Lead |
| **Reopened** | Previously closed defect has recurred | QA |
| **Won't Fix** | Accepted as known limitation, documented | QA Lead + PM |
| **Deferred** | Valid defect, deprioritized to a future release | PM |
| **Duplicate** | Already tracked under another defect ID | QA Lead |

## 5. Triage SLA

| Severity | Triage Time | Fix Time (Target) | Blocks Release? |
|----------|------------|-------------------|-----------------|
| S1 | Within 1 hour | Same sprint | Yes |
| S2 | Within 4 hours | Same sprint | Yes (with exception process) |
| S3 | Within 1 business day | Next sprint | No |
| S4 | Within 1 week | Backlog | No |
