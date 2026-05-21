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
import addFormats from 'ajv/dist/2020';
import { ApiClient } from '../helpers/api-client';
import { loginResponseSchema } from '../schemas/user.schema';
import { workoutSchema, workoutListSchema } from '../schemas/workout.schema';
import { userProfileSchema, errorResponseSchema } from '../schemas/user.schema';
import { generateRandomEmail, generateRandomDisplayName } from '../../shared/test-helpers';

// Initialize ajv with format validation (email, date-time, etc.)
const ajv = new Ajv({ allErrors: true, strict: false });

// ajv/dist/2020 may not export addFormats; handle gracefully
try {
  // Add format validators if available
  const formats = require('ajv-formats');
  formats.default ? formats.default(ajv) : formats(ajv);
} catch {
  // Format validation will be skipped if ajv-formats is not installed
}

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

test.describe('Workout Response Contract', () => {
  test('should match the workout list schema', async () => {
    // GIVEN the user is authenticated
    await client.login('test@example.com', 'password123');

    // WHEN listing workouts
    const response = await client.getWorkouts();
    const body = await response.json();

    // THEN the response should be an array of valid workout objects
    expect(Array.isArray(body)).toBe(true);

    if (body.length > 0) {
      const validate = ajv.compile(workoutSchema);
      const isValid = validate(body[0]);

      if (!isValid) {
        console.error('Workout schema errors:', validate.errors);
      }
      expect(isValid).toBe(true);
    }
  });

  test('should include exerciseType from the allowed enum values', async () => {
    // GIVEN authenticated user
    await client.login('test@example.com', 'password123');

    // WHEN listing workouts
    const response = await client.getWorkouts();
    const workouts = await response.json();

    // THEN every workout's exerciseType should be one of the valid types
    const validTypes = ['Running', 'Cycling', 'Swimming', 'Yoga', 'Weight Training'];
    for (const workout of workouts) {
      expect(validTypes).toContain(workout.exerciseType);
    }
  });

  test('should have durationMinutes within the valid range (1-1440)', async () => {
    // GIVEN authenticated user
    await client.login('test@example.com', 'password123');

    // WHEN listing workouts
    const response = await client.getWorkouts();
    const workouts = await response.json();

    // THEN every workout's duration should be within bounds
    for (const workout of workouts) {
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
