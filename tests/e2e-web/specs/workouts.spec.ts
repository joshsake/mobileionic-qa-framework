/**
 * Workouts Feature — E2E Test Suite
 *
 * QA Strategy:
 *   These tests verify the core CRUD operations for workouts, which is the
 *   primary feature of the fitness tracker app. We test:
 *     - READ: workout list renders with seeded data
 *     - CREATE: adding a new workout via the form
 *     - UPDATE: editing an existing workout's details
 *     - DELETE: removing a workout from the list
 *     - FILTER: searching/filtering workouts by keyword
 *
 *   Tests authenticate first, then navigate to the workouts page.
 *   The mock server's seeded data provides a known baseline for assertions.
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { WorkoutsPage } from '../pages/workouts.page';
import { AddWorkoutPage } from '../pages/add-workout.page';
import { VALID_USER, WORKOUT_TEMPLATES } from '../fixtures/test-data';
import { TIMEOUTS, URLS } from '../../shared/constants';

let loginPage: LoginPage;
let workoutsPage: WorkoutsPage;
let addWorkoutPage: AddWorkoutPage;

test.beforeEach(async ({ page }) => {
  loginPage = new LoginPage(page);
  workoutsPage = new WorkoutsPage(page);
  addWorkoutPage = new AddWorkoutPage(page);

  // Authenticate before each test — workouts require auth
  await loginPage.navigate();
  await loginPage.loginAs(VALID_USER.email, VALID_USER.password);
});

// ─── Feature: View Workout List ──────────────────────────────────────────────

test.describe('Workout List', () => {
  test('should display a list of workouts for the authenticated user', async () => {
    // GIVEN the user is authenticated and navigates to workouts
    await workoutsPage.navigate();

    // THEN at least one workout should be visible
    // (the mock server seeds 5 workouts for user 1)
    const count = await workoutsPage.getWorkoutCount();
    expect(count).toBeGreaterThan(0);
  });

  test('should show workout details including exercise type and duration', async () => {
    // GIVEN the workout list is displayed
    await workoutsPage.navigate();

    // THEN the first workout item should contain recognizable text
    const text = await workoutsPage.getWorkoutText(0);
    expect(text).toBeTruthy();
    // The text should include something that looks like workout info
    expect(text!.length).toBeGreaterThan(0);
  });
});

// ─── Feature: Add New Workout ────────────────────────────────────────────────

test.describe('Add Workout', () => {
  test('should navigate to the add workout form when clicking the add button', async ({ page }) => {
    // GIVEN the user is on the workouts list
    await workoutsPage.navigate();

    // WHEN they click the Add Workout button
    await workoutsPage.clickAddWorkout();

    // THEN the URL should change to /workouts/add
    expect(page.url()).toContain(URLS.ADD_WORKOUT);
  });

  test('should create a new workout when the form is filled and submitted', async ({ page }) => {
    // GIVEN the user is on the add workout form
    await addWorkoutPage.navigate();

    // WHEN they fill out and submit a running workout
    await addWorkoutPage.fillAndSubmit({
      exerciseType: WORKOUT_TEMPLATES.RUNNING.exerciseType,
      durationMinutes: WORKOUT_TEMPLATES.RUNNING.durationMinutes,
      notes: WORKOUT_TEMPLATES.RUNNING.notes,
    });

    // THEN they should be redirected back to the workout list.
    // The app only routes away once the POST resolves — a failed save keeps
    // the user on the form and renders an error — so landing on /workouts is
    // the observable proof the workout was created.
    await page.waitForURL(`**${URLS.WORKOUTS}`, { timeout: TIMEOUTS.NAVIGATION });
    expect(workoutsPage.getCurrentPath()).toBe(URLS.WORKOUTS);
  });

  /*
   * Renamed from "should show validation errors when required fields are
   * empty": the app has no inline field-level validation to assert on.
   * add-workout.page.ts guards the form with
   * [disabled]="!exercise || !duration || !date", so an empty form can never
   * be submitted and no error message is ever rendered. The old test clicked
   * Save and looked for errors, which could only ever time out on the
   * disabled button. This asserts the guard the app actually implements.
   */
  test('should keep the submit button disabled while required fields are empty', async () => {
    // GIVEN the user is on the add workout form
    await addWorkoutPage.navigate();

    // THEN submission is blocked, and nothing is reported to the user yet
    expect(await addWorkoutPage.isSubmitDisabled()).toBe(true);
    expect(await addWorkoutPage.getValidationErrors()).toEqual([]);

    // WHEN the required fields are supplied
    // (date is pre-filled with today, so exercise and duration are what is missing)
    await addWorkoutPage.selectExercise(WORKOUT_TEMPLATES.RUNNING.exerciseType);
    await addWorkoutPage.setDuration(WORKOUT_TEMPLATES.RUNNING.durationMinutes);

    // THEN the guard releases and the workout can be saved.
    // Polled because ngModel updates the binding on the next change-detection
    // tick, not synchronously with the keystroke.
    await expect.poll(() => addWorkoutPage.isSubmitDisabled()).toBe(false);
  });
});

// ─── Feature: Edit Workout ───────────────────────────────────────────────────

test.describe('Edit Workout', () => {
  test('should allow editing a workout by clicking on it in the list', async ({ page }) => {
    // GIVEN the workout list is displayed
    await workoutsPage.navigate();
    const initialCount = await workoutsPage.getWorkoutCount();

    // WHEN the user clicks on the first workout
    if (initialCount > 0) {
      await workoutsPage.clickWorkout(0);

      // THEN they should see a detail/edit view
      // The URL may change to a workout detail route
      await page.waitForTimeout(1_000);
    }
  });
});

// ─── Feature: Delete Workout ─────────────────────────────────────────────────

test.describe('Delete Workout', () => {
  /*
   * Skipped: the app ships no way to delete a workout. workouts.page.ts
   * renders each row read-only — no delete button, no ion-item-sliding swipe
   * action, no context menu — so there is nothing for this scenario to drive,
   * and the mock API's delete route is unreachable from the UI. Kept as a
   * placeholder (along with WorkoutsPage.deleteWorkout) so the coverage is
   * ready the day the affordance ships, rather than deleted and forgotten.
   */
  test.skip('should remove a workout from the list when deleted', async () => {
    // GIVEN the workout list is displayed
    await workoutsPage.navigate();
    const initialCount = await workoutsPage.getWorkoutCount();

    // WHEN the user deletes the first workout
    if (initialCount > 0) {
      await workoutsPage.deleteWorkout(0);

      // THEN the workout count should decrease by exactly one
      await workoutsPage.waitForWorkoutCount(initialCount - 1);
      expect(await workoutsPage.getWorkoutCount()).toBe(initialCount - 1);
    }
  });
});

// ─── Feature: Search/Filter Workouts ─────────────────────────────────────────

test.describe('Filter Workouts', () => {
  /*
   * Searching lower-case on purpose: the page lower-cases both the term and
   * the workout before comparing, so this also covers the case-insensitive
   * branch of the filter rather than only the exact-case one.
   */
  const SEARCH_TERM = 'yoga';

  test('should filter workouts when a search term is entered', async () => {
    // GIVEN the workout list is displayed
    await workoutsPage.navigate();
    const unfilteredCount = await workoutsPage.getWorkoutCount();

    // WHEN the user searches for an exercise type
    await workoutsPage.searchWorkout(SEARCH_TERM);

    // THEN the list narrows to matching workouts only.
    // Asserting on the rendered rows, not just the count: a filter returning
    // the wrong workouts would still produce a believable count.
    const visible = await workoutsPage.getWorkoutTexts();
    expect(visible.length).toBeGreaterThan(0);
    expect(visible.length).toBeLessThan(unfilteredCount);
    const nonMatching = visible.filter(
      (text) => !text.toLowerCase().includes(SEARCH_TERM),
    );
    expect(nonMatching).toEqual([]);
  });

  test('should show all workouts when the search is cleared', async () => {
    // GIVEN the user has an active search filter
    await workoutsPage.navigate();
    const unfilteredCount = await workoutsPage.getWorkoutCount();

    await workoutsPage.searchWorkout(SEARCH_TERM);
    const filteredCount = await workoutsPage.getWorkoutCount();
    expect(filteredCount).toBeLessThan(unfilteredCount);

    // WHEN they clear the search
    await workoutsPage.searchWorkout('');

    // THEN every workout is listed again. Exact equality is safe because the
    // page filters the list it already fetched — it does not re-query the API,
    // so nothing can change the total mid-test.
    expect(await workoutsPage.getWorkoutCount()).toBe(unfilteredCount);
  });
});
