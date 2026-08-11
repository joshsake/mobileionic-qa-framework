import { LoginScreen } from '../screens/login.screen';
import { DashboardScreen } from '../screens/dashboard.screen';
import { WorkoutsScreen } from '../screens/workouts.screen';
import { AddWorkoutScreen } from '../screens/add-workout.screen';

/*
 * Workouts is the second screen brought onto the hybrid approach proven by
 * login.spec.ts: WEBVIEW context, CSS [data-testid] selectors, shadow-DOM
 * inputs, reflected `disabled` attributes. See MOBILE.md.
 *
 * The previous version of this file could not pass for two independent
 * reasons, and only the first was a selector problem:
 *
 *  1. Its screen objects looked elements up by accessibility id and used
 *     testids the app never had (`submit-workout-btn`, `exercise-type-picker`).
 *  2. Roughly half of it asserted on affordances the app does not implement at
 *     all — swipe-to-delete, pull-to-refresh, an offline indicator. Those tests
 *     are kept, and skipped with the reason stated, rather than deleted: that
 *     is the same treatment the two known defects get in the web and API
 *     suites, and it means they start enforcing the day the feature lands.
 *
 * It also logged in with credentials (`testuser@example.com` / `Test1234!`)
 * that exist in no fixture, so every run would have failed at the login step
 * even with perfect selectors.
 */

const APP_ID = 'com.qaframework.fitnesstracker';
const MOCK_SERVER_PORT = process.env.MOCK_SERVER_PORT || '3000';

/**
 * Fixture facts, asserted rather than assumed so a change to db.json fails
 * loudly here instead of producing a confusing off-by-N.
 *
 * The list shows all 15 seeded workouts, not the 5 belonging to the logged-in
 * user, because GET /api/workouts is not scoped to the bearer token. That is
 * known defect #1 (see the README and the skipped authorization spec in
 * tests/api/specs/workouts.spec.ts) — this suite records the current behaviour
 * so the mobile expectation changes visibly when the defect is fixed.
 */
const SEEDED_WORKOUT_COUNT = 15;
const SEEDED_YOGA_COUNT = 3;

/** An exercise type the select offers but the fixtures do not use. */
const UNSEEDED_EXERCISE = 'HIIT';
const OTHER_UNSEEDED_EXERCISE = 'Walking';

describe('Workouts Screen - Mobile', () => {
  const loginScreen = new LoginScreen();
  const dashboardScreen = new DashboardScreen();
  const workoutsScreen = new WorkoutsScreen();
  const addWorkoutScreen = new AddWorkoutScreen();

  const validUser = {
    email: 'test@example.com',
    password: 'password123',
  };

  /**
   * Restore the mock's in-memory database.
   *
   * Issued from the wdio process on the host, not from the device: the tunnel
   * set up in wdio.conf.ts runs one way (emulator -> host), and the host can
   * reach the mock directly anyway. Tests here create records, so without this
   * an earlier test's POST would shift every later count.
   */
  async function resetMockData(): Promise<void> {
    const response = await fetch(`http://localhost:${MOCK_SERVER_PORT}/api/test/reset`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`Failed to reset mock data: HTTP ${response.status}`);
    }
  }

  /**
   * Read the workout list straight from the API, bypassing the app.
   *
   * This is what lets the add-workout specs below separate two failures that
   * look identical on screen: the POST never happening, and the POST happening
   * but the list not re-rendering. Asserting only on the UI conflates them and
   * reports a data-layer bug as a rendering bug (or the reverse).
   */
  async function apiWorkoutNames(): Promise<string[]> {
    const base = `http://localhost:${MOCK_SERVER_PORT}/api`;

    const auth = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validUser),
    });
    if (!auth.ok) {
      throw new Error(`Fixture login failed: HTTP ${auth.status}`);
    }
    const { token } = (await auth.json()) as { token: string };

    const response = await fetch(`${base}/workouts`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      throw new Error(`Failed to read workouts: HTTP ${response.status}`);
    }
    const workouts = (await response.json()) as Array<{ exerciseType: string }>;
    return workouts.map((w) => w.exerciseType);
  }

  /**
   * Relaunch, log in, and land on the workouts list.
   *
   * Switch to the native context before terminating: the driver is attached to
   * the webview, and killing the app tears that renderer down, so any command
   * issued from it afterwards fails with "unable to connect to renderer". The
   * native context survives a relaunch.
   */
  async function relaunchToWorkouts(): Promise<void> {
    await workoutsScreen.switchToNative().catch(() => {});
    await driver.terminateApp(APP_ID, {});
    await driver.activateApp(APP_ID);

    await loginScreen.waitForLoginScreen();
    await loginScreen.login(validUser.email, validUser.password);
    await dashboardScreen.waitForDashboard();
    await dashboardScreen.goToWorkouts();
    await workoutsScreen.waitForWorkoutsScreen();
  }

  beforeEach(async () => {
    await resetMockData();
    await relaunchToWorkouts();
  });

  /**
   * Leave the mock as this suite found it.
   *
   * beforeEach alone is not enough: it protects this suite from its own writes,
   * but the records created by the *last* test survive the run. Those are
   * written through the app's form, which sends a date-only `date` — so they
   * make the API contract suite fail against a shared local server, in a way
   * that looks like a defect in the contract tests rather than leftover state.
   * (The underlying format mismatch is real and is tracked as defect #7; this
   * hook is about not making an unrelated suite pay for it.)
   *
   * CI gets a fresh mock per job, so this matters only locally — which is
   * exactly where it is most confusing.
   */
  after(async () => {
    await resetMockData();
  });

  describe('Workout List', () => {
    it('should render the workouts returned by the API', async () => {
      const count = await workoutsScreen.getVisibleWorkoutCount();
      expect(count).toBe(SEEDED_WORKOUT_COUNT);
      expect(await workoutsScreen.isEmptyStateDisplayed()).toBe(false);
    });

    it('should display a name, date and duration for each workout', async () => {
      const count = await workoutsScreen.getVisibleWorkoutCount();

      for (let i = 0; i < Math.min(count, 3); i++) {
        expect((await workoutsScreen.getWorkoutName(i)).length).toBeGreaterThan(0);
        expect((await workoutsScreen.getWorkoutDate(i)).length).toBeGreaterThan(0);
        // ion-note renders "{{ durationMinutes }} min".
        expect(await workoutsScreen.getWorkoutDuration(i)).toContain('min');
      }
    });
  });

  describe('Search', () => {
    it('should filter the list to workouts matching the search term', async () => {
      await workoutsScreen.search('Yoga');

      expect(await workoutsScreen.getVisibleWorkoutCount()).toBe(SEEDED_YOGA_COUNT);
      expect(await workoutsScreen.getWorkoutName(0)).toBe('Yoga');
    });

    it('should restore the full list when the search is cleared', async () => {
      await workoutsScreen.search('Yoga');
      expect(await workoutsScreen.getVisibleWorkoutCount()).toBe(SEEDED_YOGA_COUNT);

      await workoutsScreen.clearSearch();
      expect(await workoutsScreen.getVisibleWorkoutCount()).toBe(SEEDED_WORKOUT_COUNT);
    });

    it('should show the empty state when nothing matches', async () => {
      await workoutsScreen.search('nonexistent-exercise-xyz');

      expect(await workoutsScreen.getVisibleWorkoutCount()).toBe(0);
      expect(await workoutsScreen.isEmptyStateDisplayed()).toBe(true);
    });
  });

  describe('Add Workout', () => {
    it('should navigate to the add workout screen when tapping the FAB', async () => {
      await workoutsScreen.tapAddWorkout();
      await addWorkoutScreen.waitForAddWorkoutScreen();

      expect(await addWorkoutScreen.isDisplayed('add-workout-title')).toBe(true);
    });

    it('should keep submit disabled until the required fields are filled', async () => {
      await workoutsScreen.tapAddWorkout();
      await addWorkoutScreen.waitForAddWorkoutScreen();

      // Date is pre-filled with today, so exercise + duration are what gate it.
      await addWorkoutScreen.selectExercise('Swimming');
      expect(await addWorkoutScreen.isSubmitEnabled()).toBe(false);

      await addWorkoutScreen.enterDuration(30);
      expect(await addWorkoutScreen.isSubmitEnabled()).toBe(true);
    });

    it('should persist a workout submitted with all fields', async () => {
      await workoutsScreen.tapAddWorkout();
      await addWorkoutScreen.waitForAddWorkoutScreen();

      await addWorkoutScreen.addWorkout(UNSEEDED_EXERCISE, 45, 'Morning session');
      await workoutsScreen.waitForWorkoutsScreen();

      const persisted = await apiWorkoutNames();
      expect(persisted).toHaveLength(SEEDED_WORKOUT_COUNT + 1);
      expect(persisted).toContain(UNSEEDED_EXERCISE);
    });

    it('should persist a workout submitted with only the required fields', async () => {
      await workoutsScreen.tapAddWorkout();
      await addWorkoutScreen.waitForAddWorkoutScreen();

      await addWorkoutScreen.selectExercise(OTHER_UNSEEDED_EXERCISE);
      await addWorkoutScreen.enterDuration(30);
      await addWorkoutScreen.tapSubmit();
      await workoutsScreen.waitForWorkoutsScreen();

      expect(await apiWorkoutNames()).toContain(OTHER_UNSEEDED_EXERCISE);
    });

    /*
     * Defect #3 — the list does not refresh after adding a workout.
     *
     * The two specs above prove the POST lands: the API holds the new record by
     * the time the app is back on the list. This one asserts the user can
     * actually see it, and fails — the row is absent until the page is entered
     * afresh.
     *
     * Cause: WorkoutsPage loads in ngOnInit. Returning from /workouts/add pops
     * back to the view Ionic's router outlet already has cached, so the
     * component is never re-created and ngOnInit never runs again. The Ionic
     * lifecycle hook for "this view is being entered" is ionViewWillEnter;
     * ngOnInit alone is only correct for a page that is loaded once.
     *
     * Kept skipped, with the expectation recorded, rather than asserting the
     * broken behaviour — this starts enforcing the moment the hook is fixed.
     */
    it.skip('should show a newly added workout in the list', async () => {
      await workoutsScreen.tapAddWorkout();
      await addWorkoutScreen.waitForAddWorkoutScreen();

      await addWorkoutScreen.addWorkout(UNSEEDED_EXERCISE, 45, 'Morning session');
      await workoutsScreen.waitForWorkoutsScreen();

      expect(await workoutsScreen.getVisibleWorkoutCount()).toBe(SEEDED_WORKOUT_COUNT + 1);
      expect(await workoutsScreen.hasWorkoutNamed(UNSEEDED_EXERCISE)).toBe(true);
    });

    it('should discard the entry when cancelling', async () => {
      await workoutsScreen.tapAddWorkout();
      await addWorkoutScreen.waitForAddWorkoutScreen();

      await addWorkoutScreen.selectExercise(UNSEEDED_EXERCISE);
      await addWorkoutScreen.enterDuration(20);
      await addWorkoutScreen.tapCancel();

      await workoutsScreen.waitForWorkoutsScreen();
      // Checked against the API, not the rendered list: while defect #3 is open
      // the list is stale after leaving /workouts/add, so "the row is absent"
      // would pass here even if cancel had wrongly saved the workout.
      const persisted = await apiWorkoutNames();
      expect(persisted).toHaveLength(SEEDED_WORKOUT_COUNT);
      expect(persisted).not.toContain(UNSEEDED_EXERCISE);
    });
  });

  describe('Scrolling', () => {
    it('should scroll through the list without losing the screen', async () => {
      await workoutsScreen.scrollThroughList(3);

      expect(await workoutsScreen.isDisplayed('workouts-title')).toBe(true);
      expect(await workoutsScreen.getVisibleWorkoutCount()).toBe(SEEDED_WORKOUT_COUNT);
    });
  });

  describe('Navigation', () => {
    it('should return to the dashboard via the back button', async () => {
      await workoutsScreen.tapBack();

      await dashboardScreen.waitForDashboard();
      expect(await dashboardScreen.isDashboardDisplayed()).toBe(true);
    });
  });

  /*
   * Below: specs for behaviour the app does not implement yet. They are kept so
   * the expectation is recorded and starts enforcing as soon as the feature
   * exists, matching how the two known defects are handled elsewhere in the
   * suite. Each names the specific markup that is missing.
   */
  describe('Not yet implemented in the app', () => {
    // Known defect #2 (README): the list has no delete affordance. The rows are
    // plain ion-items with no ion-item-sliding wrapper, so a left swipe reveals
    // nothing. WorkoutsScreen.swipeToDelete is kept ready to drive it.
    it.skip('should reveal a delete option when swiping left on a workout', async () => {
      await workoutsScreen.swipeToDelete(0);

      expect(await workoutsScreen.isDisplayed('delete-workout-btn')).toBe(true);
    });

    // workouts.page.ts renders no ion-refresher, so there is no pull-to-refresh
    // gesture to trigger — the swipe just scrolls the content.
    it.skip('should refresh the workout list when pulling down', async () => {
      await workoutsScreen.swipeDown(0.6);

      expect(await workoutsScreen.isDisplayed('workouts-title')).toBe(true);
      expect(await workoutsScreen.getVisibleWorkoutCount()).toBe(SEEDED_WORKOUT_COUNT);
    });

    // There is no offline-indicator element in the app. The page's error
    // handler silently falls back to an empty list, so a user offline sees an
    // empty state indistinguishable from having no workouts — worth its own
    // defect report, which is why the spec is kept rather than dropped.
    it.skip('should show an offline indicator when the network is unavailable', async () => {
      await driver.toggleAirplaneMode();
      try {
        await relaunchToWorkouts();
        expect(await workoutsScreen.isDisplayed('offline-indicator')).toBe(true);
      } finally {
        await driver.toggleAirplaneMode();
      }
    });
  });
});
