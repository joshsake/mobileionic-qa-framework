/**
 * API Contract Tests — Schema Validation Suite
 *
 * QA Strategy:
 *   Contract tests validate that API responses conform to a documented
 *   schema. Unlike functional tests (which check behavior), contract tests
 *   check structure. This catches:
 *     - Fields accidentally renamed or removed during refactoring
 *     - New required fields added without frontend awareness
 *     - Type changes (e.g., number becoming string)
 *     - Security leaks (e.g., passwordHash appearing in profile response)
 *
 *   We use ajv (JSON Schema validator) for schema assertions. Schemas are
 *   defined in tests/api/schemas/ and mirror the C# DTOs.
 */

import { test, expect } from '@playwright/test';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { ApiClient } from '../helpers/api-client';
import { loginResponseSchema } from '../schemas/user.schema';
import { workoutSchema, workoutListSchema } from '../schemas/workout.schema';
import { userProfileSchema, errorResponseSchema } from '../schemas/user.schema';
import { generateRandomEmail, generateRandomDisplayName } from '../../shared/test-helpers';

const ajv = new Ajv({ allErrors: true, strict: false });

/*
 * Register the format validators for date-time, email and friends.
 *
 * This was previously a require() inside a try/catch that swallowed the failure
 * when ajv-formats was missing — which it was. Every `format` keyword in the
 * schemas was silently ignored, so a malformed timestamp would still pass a
 * contract test. ajv-formats is now a declared dependency and imported
 * directly, so a missing install fails loudly at import time instead.
 */
addFormats(ajv);

let client: ApiClient;

test.beforeEach(async ({ request }) => {
  client = new ApiClient(request);
});

// ─── Contract: Login Response ───────────────────────────────────────────────

test.describe('Login Response Contract', () => {
  test('should match the LoginResponse schema on successful login', async () => {
    // WHEN logging in with valid credentials
    const response = await client.login('test@example.com', 'password123');
    const body = await response.json();

    // THEN the response should conform to the login response schema
    const validate = ajv.compile(loginResponseSchema);
    const isValid = validate(body);

    if (!isValid) {
      console.error('Schema validation errors:', validate.errors);
    }
    expect(isValid).toBe(true);
  });

  test('should match the LoginResponse schema on successful registration', async () => {
    // WHEN registering a new user
    const response = await client.register(
      generateRandomEmail('contract'),
      'testpass123',
      generateRandomDisplayName(),
    );
    const body = await response.json();

    // THEN the response should also conform to the login response schema
    const validate = ajv.compile(loginResponseSchema);
    const isValid = validate(body);

    if (!isValid) {
      console.error('Schema validation errors:', validate.errors);
    }
    expect(isValid).toBe(true);
  });
});

// ─── Contract: Error Response ───────────────────────────────────────────────

test.describe('Error Response Contract', () => {
  test('should match the error schema on 401 response', async () => {
    // WHEN login fails
    const response = await client.login('nobody@example.com', 'wrong');
    const body = await response.json();

    // THEN the error response should have a message field
    const validate = ajv.compile(errorResponseSchema);
    const isValid = validate(body);

    expect(isValid).toBe(true);
  });

  test('should match the error schema on 409 response', async () => {
    // WHEN registering with a duplicate email
    const response = await client.register(
      'test@example.com',
      'password123',
      'Duplicate',
    );
    const body = await response.json();

    // THEN the error response should have a message field
    const validate = ajv.compile(errorResponseSchema);
    const isValid = validate(body);

    expect(isValid).toBe(true);
  });
});

// ─── Contract: Workout Response ─────────────────────────────────────────────

/**
 * These tests originally asserted over every workout returned by the API. That
 * made them dependent on shared mutable state: the suite runs fullyParallel, so
 * a POST or PUT from workouts.spec.ts could land between this file's read and
 * its assertion, and a record mutated there would fail a schema check here.
 *
 * Each test now creates the record it asserts on and cleans up afterwards, so a
 * contract failure means the contract actually broke — not that another spec
 * happened to be writing at the same moment.
 */
test.describe('Workout Response Contract', () => {
  const createdWorkoutIds: number[] = [];

  /** Create a workout owned by this test and register it for cleanup. */
  async function createOwnedWorkout(overrides: Record<string, unknown> = {}) {
    const response = await client.createWorkout({
      exerciseType: 'Running',
      durationMinutes: 30,
      notes: 'Contract test fixture',
      date: new Date().toISOString(),
      ...overrides,
    });
    expect(response.status()).toBe(201);

    const workout = await response.json();
    createdWorkoutIds.push(workout.id);
    return workout;
  }

  test.afterEach(async () => {
    // Remove fixtures so the suite leaves no residue for other specs.
    while (createdWorkoutIds.length > 0) {
      const id = createdWorkoutIds.pop();
      if (id !== undefined) await client.deleteWorkout(id);
    }
  });

  test('should match the workout schema for a created workout', async () => {
    // GIVEN the user is authenticated
    await client.login('test@example.com', 'password123');

    // WHEN a workout is created
    const workout = await createOwnedWorkout();

    // THEN it should satisfy the documented workout schema
    const validate = ajv.compile(workoutSchema);
    const isValid = validate(workout);

    if (!isValid) {
      console.error('Workout schema errors:', validate.errors);
    }
    expect(isValid).toBe(true);
  });

  test('should return an array conforming to the workout list schema', async () => {
    // GIVEN the user is authenticated with at least one workout present
    await client.login('test@example.com', 'password123');
    await createOwnedWorkout();

    // WHEN listing workouts
    const response = await client.getWorkouts();
    const body = await response.json();

    // THEN the payload should be a non-empty array
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);

    // AND the collection as a whole should satisfy the list schema
    const validateList = ajv.compile(workoutListSchema);
    const listIsValid = validateList(body);

    if (!listIsValid) {
      console.error('Workout list schema errors:', validateList.errors);
    }
    expect(listIsValid).toBe(true);

    // AND the workout this test owns should be present and individually valid
    const validate = ajv.compile(workoutSchema);
    const owned = body.find((w: { id: number }) => w.id === createdWorkoutIds[0]);

    expect(owned).toBeDefined();
    expect(validate(owned)).toBe(true);
  });

  test('should persist exerciseType from the allowed enum values', async () => {
    // GIVEN authenticated user
    await client.login('test@example.com', 'password123');

    const validTypes = ['Running', 'Cycling', 'Swimming', 'Yoga', 'Weight Training'];

    // WHEN a workout is created for each allowed exercise type
    for (const exerciseType of validTypes) {
      const workout = await createOwnedWorkout({ exerciseType });

      // THEN the API should echo back the same enum value
      expect(validTypes).toContain(workout.exerciseType);
      expect(workout.exerciseType).toBe(exerciseType);
    }
  });

  test('should persist durationMinutes within the valid range (1-1440)', async () => {
    // GIVEN authenticated user
    await client.login('test@example.com', 'password123');

    // WHEN workouts are created at the boundaries and midpoint of the range
    for (const durationMinutes of [1, 60, 1440]) {
      const workout = await createOwnedWorkout({ durationMinutes });

      // THEN the stored duration should round-trip within bounds
      expect(workout.durationMinutes).toBe(durationMinutes);
      expect(workout.durationMinutes).toBeGreaterThanOrEqual(1);
      expect(workout.durationMinutes).toBeLessThanOrEqual(1440);
    }
  });
});

// ─── Contract: Profile Response ─────────────────────────────────────────────

test.describe('Profile Response Contract', () => {
  test('should match the user profile schema', async () => {
    // GIVEN authenticated user
    await client.login('test@example.com', 'password123');

    // WHEN fetching the profile
    const response = await client.getProfile();
    const body = await response.json();

    // THEN it should match the profile schema
    const validate = ajv.compile(userProfileSchema);
    const isValid = validate(body);

    if (!isValid) {
      console.error('Profile schema errors:', validate.errors);
    }
    expect(isValid).toBe(true);
  });

  test('should NOT expose the passwordHash field in the profile response', async () => {
    // GIVEN authenticated user
    await client.login('test@example.com', 'password123');

    // WHEN fetching the profile
    const response = await client.getProfile();
    const body = await response.json();

    // THEN passwordHash must not be present (security requirement)
    expect(body).not.toHaveProperty('passwordHash');
  });
});
