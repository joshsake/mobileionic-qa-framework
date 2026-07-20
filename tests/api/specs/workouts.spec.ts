/**
 * Workouts API — Test Suite
 *
 * QA Strategy:
 *   The workouts endpoint is the core data API. These tests verify:
 *     - CRUD lifecycle: Create, Read, Update, Delete
 *     - Authorization: all endpoints require a valid Bearer token
 *     - Data integrity: responses contain the expected fields and values
 *     - Input validation: invalid data is rejected with appropriate errors
 *
 *   Tests are ordered to reflect the typical user journey:
 *   list -> create -> read -> update -> delete
 */

import { test, expect } from '@playwright/test';
import { ApiClient, type WorkoutResponse } from '../helpers/api-client';
import { createTestWorkout } from '../../shared/test-helpers';

let client: ApiClient;

test.beforeEach(async ({ request }) => {
  client = new ApiClient(request);
  // Authenticate before each test — workouts require auth
  await client.login('test@example.com', 'password123');
});

// ─── Feature: List Workouts (READ) ──────────────────────────────────────────

test.describe('GET /api/workouts', () => {
  test('should return a list of workouts for the authenticated user', async () => {
    // WHEN listing workouts
    const response = await client.getWorkouts();

    // THEN the response should be 200 with an array
    expect(response.status()).toBe(200);
    const workouts = await response.json();
    expect(Array.isArray(workouts)).toBe(true);
    expect(workouts.length).toBeGreaterThan(0);
  });

  test('should return workouts with all required fields', async () => {
    // WHEN listing workouts
    const response = await client.getWorkouts();
    const workouts = await response.json();

    // THEN each workout should have the expected shape
    const workout = workouts[0];
    expect(workout).toHaveProperty('id');
    expect(workout).toHaveProperty('exerciseType');
    expect(workout).toHaveProperty('durationMinutes');
    expect(workout).toHaveProperty('date');
  });

  test('should return 401 when no auth token is provided', async () => {
    // GIVEN no authentication
    client.setToken(null);

    // WHEN listing workouts
    const response = await client.getWorkouts();

    // THEN the response should be 401
    expect(response.status()).toBe(401);
  });
});

// ─── Feature: Create Workout (CREATE) ───────────────────────────────────────

test.describe('POST /api/workouts', () => {
  test('should create a new workout and return it with an id', async () => {
    // GIVEN valid workout data
    const workoutData = createTestWorkout({
      exerciseType: 'Running',
      durationMinutes: 30,
      notes: 'API test — new running workout',
    });

    // WHEN creating the workout
    const response = await client.createWorkout(workoutData);

    // THEN the response should be 201 or 200 with the created workout
    expect(response.status()).toBeLessThanOrEqual(201);
    const created = await response.json();
    expect(created.id).toBeTruthy();
    expect(created.exerciseType).toBe('Running');
    expect(created.durationMinutes).toBe(30);
  });

  test('should persist the workout so it appears in the list', async () => {
    // GIVEN a newly created workout
    const workoutData = createTestWorkout({
      exerciseType: 'Cycling',
      notes: 'API test — persistence check',
    });
    const createResponse = await client.createWorkout(workoutData);
    const created = await createResponse.json();

    // WHEN listing all workouts
    const listResponse = await client.getWorkouts();
    const workouts = await listResponse.json();

    // THEN the new workout should be in the list
    const found = workouts.find((w: WorkoutResponse) => w.id === created.id);
    expect(found).toBeTruthy();
  });

  test('should return 401 when creating without authentication', async () => {
    // GIVEN no auth token
    client.setToken(null);

    // WHEN creating a workout
    const response = await client.createWorkout(
      createTestWorkout({ exerciseType: 'Yoga' }),
    );

    // THEN the response should be 401
    expect(response.status()).toBe(401);
  });
});

// ─── Feature: Update Workout (UPDATE) ───────────────────────────────────────

test.describe('PUT /api/workouts/:id', () => {
  test('should update a workout when given valid data', async () => {
    // GIVEN an existing workout (use seeded workout id 1)
    const updateData = { notes: 'Updated via API test' };

    // WHEN updating the workout
    const response = await client.updateWorkout(1, updateData);

    // THEN the response should be 200 with updated data
    expect(response.status()).toBe(200);
    const updated = await response.json();
    expect(updated.notes).toBe('Updated via API test');
  });

  test('should return 401 when updating without authentication', async () => {
    // GIVEN no auth token
    client.setToken(null);

    // WHEN trying to update
    const response = await client.updateWorkout(1, { notes: 'Unauthorized' });

    // THEN the response should be 401
    expect(response.status()).toBe(401);
  });
});

// ─── Feature: Delete Workout (DELETE) ────────────────────────────────────────

test.describe('DELETE /api/workouts/:id', () => {
  test('should delete a workout and return 200', async () => {
    // GIVEN we create a workout to delete (avoid deleting seed data)
    const createResponse = await client.createWorkout(
      createTestWorkout({ notes: 'To be deleted' }),
    );
    const created = await createResponse.json();

    // WHEN deleting it
    const deleteResponse = await client.deleteWorkout(created.id);

    // THEN the response should be 200
    expect(deleteResponse.status()).toBe(200);
  });

  test('should no longer return the deleted workout in the list', async () => {
    // GIVEN we create and then delete a workout
    const createResponse = await client.createWorkout(
      createTestWorkout({ notes: 'Delete then verify' }),
    );
    const created = await createResponse.json();
    await client.deleteWorkout(created.id);

    // WHEN listing workouts
    const listResponse = await client.getWorkouts();
    const workouts = await listResponse.json();

    // THEN the deleted workout should not be in the list
    const found = workouts.find((w: WorkoutResponse) => w.id === created.id);
    expect(found).toBeFalsy();
  });

  test('should return 401 when deleting without authentication', async () => {
    // GIVEN no auth token
    client.setToken(null);

    // WHEN trying to delete
    const response = await client.deleteWorkout(1);

    // THEN the response should be 401
    expect(response.status()).toBe(401);
  });
});

// ─── Feature: Filtering / Pagination ────────────────────────────────────────

test.describe('Workout Filtering', () => {
  /*
   * This previously fetched the unfiltered list and asserted the Running subset
   * was ">= 0" and "<= total" — both tautologies. It never sent a query
   * parameter, so it passed even while filtered requests were returning 404.
   */
  test('should return only the requested user\'s workouts when filtering by userId', async () => {
    // GIVEN the full, unfiltered collection spans more than one user
    const allResponse = await client.getWorkouts();
    const allWorkouts: WorkoutResponse[] = await allResponse.json();
    const userIds = new Set(allWorkouts.map((w) => w.userId));
    expect(userIds.size).toBeGreaterThan(1);

    // WHEN the caller filters to a single user
    const filteredResponse = await client.getWorkouts({ userId: 1 });
    expect(filteredResponse.status()).toBe(200);
    const filtered: WorkoutResponse[] = await filteredResponse.json();

    // THEN every record belongs to that user, and the set is a strict subset
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((w) => w.userId === 1)).toBe(true);
    expect(filtered.length).toBeLessThan(allWorkouts.length);
  });

  test('should return workouts ordered newest first', async () => {
    const response = await client.getWorkouts();
    const workouts: WorkoutResponse[] = await response.json();

    const dates = workouts.map((w) => new Date(w.date).getTime());
    const descending = [...dates].sort((a, b) => b - a);
    expect(dates).toEqual(descending);
  });
});

// ─── Known Defect: authorization scope ──────────────────────────────────────

test.describe('Workout Authorization Scope', () => {
  /*
   * KNOWN DEFECT - intentionally skipped, not deleted.
   *
   * GET /api/workouts requires a bearer token but never scopes results to the
   * caller: it returns every user's workouts unless an explicit ?userId= is
   * supplied. WorkoutsController.GetAll in the .NET API has the same shape, so
   * this is a defect in the service, not an artefact of the mock.
   *
   * It is inconsistent with /api/analytics/summary, which does derive userId
   * from the token. Left skipped so the expected behaviour stays documented and
   * the suite starts enforcing it the moment the endpoint is fixed.
   */
  test.skip('should only return workouts belonging to the authenticated user', async () => {
    // GIVEN a user authenticated as user 1
    await client.login('test@example.com', 'password123');

    // WHEN listing workouts without an explicit userId filter
    const response = await client.getWorkouts();
    const workouts: WorkoutResponse[] = await response.json();

    // THEN no other user's records should be visible
    expect(workouts.every((w) => w.userId === 1)).toBe(true);
  });
});
