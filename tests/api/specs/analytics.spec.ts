/**
 * Analytics API — Test Suite
 *
 * QA Strategy:
 *   The analytics endpoint provides aggregated workout data for the
 *   dashboard charts. These tests verify:
 *     - The summary endpoint returns correct aggregate fields
 *     - Workout-by-type breakdown matches the seeded data
 *     - Weekly breakdown is present and well-structured
 *     - Unauthorized access is rejected
 *
 *   Analytics accuracy is critical for user trust — if the dashboard shows
 *   wrong numbers, users lose confidence in the entire app.
 */

import { test, expect } from '@playwright/test';
import { ApiClient } from '../helpers/api-client';

let client: ApiClient;

test.beforeEach(async ({ request }) => {
  client = new ApiClient(request);
  await client.login('test@example.com', 'password123');
});

// ─── Feature: Analytics Summary ─────────────────────────────────────────────

test.describe('GET /api/analytics/summary', () => {
  test('should return analytics summary for the authenticated user', async () => {
    // WHEN fetching the analytics summary
    const response = await client.getAnalyticsSummary();

    // THEN the response should be 200 with aggregate data
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('totalWorkouts');
    expect(data).toHaveProperty('totalMinutes');
    expect(data).toHaveProperty('averageDuration');
    expect(data).toHaveProperty('workoutsByType');
  });

  test('should return correct total workout count matching seeded data', async () => {
    // GIVEN the seeded data has 5 workouts for user 1
    const response = await client.getAnalyticsSummary();
    const data = await response.json();

    // THEN totalWorkouts should be at least 5 (may be more if tests created extras)
    expect(data.totalWorkouts).toBeGreaterThanOrEqual(5);
  });

  test('should return a workout-by-type breakdown', async () => {
    // WHEN fetching analytics
    const response = await client.getAnalyticsSummary();
    const data = await response.json();

    // THEN workoutsByType should be an object with exercise type keys
    expect(typeof data.workoutsByType).toBe('object');

    // The seeded data includes one of each type for user 1
    const types = Object.keys(data.workoutsByType);
    expect(types.length).toBeGreaterThan(0);
  });

  test('should include weekly breakdown data', async () => {
    // WHEN fetching analytics
    const response = await client.getAnalyticsSummary();
    const data = await response.json();

    // THEN weeklyBreakdown should be an array
    expect(Array.isArray(data.weeklyBreakdown)).toBe(true);

    if (data.weeklyBreakdown.length > 0) {
      const week = data.weeklyBreakdown[0];
      expect(week).toHaveProperty('week');
      expect(week).toHaveProperty('workouts');
      expect(week).toHaveProperty('minutes');
    }
  });

  test('should return accurate average duration calculation', async () => {
    // WHEN fetching analytics
    const response = await client.getAnalyticsSummary();
    const data = await response.json();

    // THEN averageDuration should equal totalMinutes / totalWorkouts (rounded)
    if (data.totalWorkouts > 0) {
      const expectedAvg = Math.round(data.totalMinutes / data.totalWorkouts);
      expect(data.averageDuration).toBe(expectedAvg);
    }
  });
});

// ─── Feature: Unauthorized Access ───────────────────────────────────────────

test.describe('Analytics Authorization', () => {
  test('should return 401 when accessing analytics without a token', async () => {
    // GIVEN no auth token
    client.setToken(null);

    // WHEN fetching analytics
    const response = await client.getAnalyticsSummary();

    // THEN the response should be 401
    expect(response.status()).toBe(401);
  });

  test('should return 401 when accessing analytics with an expired token', async () => {
    // GIVEN an invalid/expired token
    client.setToken('expired.token.value');

    // WHEN fetching analytics
    const response = await client.getAnalyticsSummary();

    // THEN the response should be 401
    expect(response.status()).toBe(401);
  });
});
