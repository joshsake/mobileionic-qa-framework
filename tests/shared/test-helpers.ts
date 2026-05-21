/**
 * Shared test utility functions used by both E2E and API test suites.
 *
 * These helpers reduce boilerplate in spec files and ensure consistent
 * patterns for common operations like generating test data, retrying
 * flaky operations, and building authenticated API requests.
 */

import { type APIRequestContext } from '@playwright/test';
import { API } from './constants';

// ─── Random Data Generators ─────────────────────────────────────────────────

/**
 * Generate a unique email address for test isolation.
 * Each test run gets a distinct email so tests don't collide on shared state.
 */
export function generateRandomEmail(prefix = 'testuser'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}@test.example.com`;
}

/**
 * Generate a random display name for user registration tests.
 */
export function generateRandomDisplayName(): string {
  const adjectives = ['Quick', 'Strong', 'Steady', 'Brave', 'Calm'];
  const nouns = ['Runner', 'Cyclist', 'Swimmer', 'Lifter', 'Yogi'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj} ${noun} ${Math.floor(Math.random() * 1000)}`;
}

// ─── Test Workout Factory ───────────────────────────────────────────────────

export interface TestWorkout {
  exerciseType: string;
  durationMinutes: number;
  notes: string;
  date: string;
  userId?: number;
}

/**
 * Create a workout object suitable for POST /api/workouts requests.
 * Accepts partial overrides for any field.
 */
export function createTestWorkout(overrides: Partial<TestWorkout> = {}): TestWorkout {
  const exerciseTypes = ['Running', 'Cycling', 'Swimming', 'Yoga', 'Weight Training'];
  return {
    exerciseType: exerciseTypes[Math.floor(Math.random() * exerciseTypes.length)],
    durationMinutes: Math.floor(Math.random() * 60) + 15, // 15-74 minutes
    notes: `Auto-generated test workout ${Date.now()}`,
    date: new Date().toISOString(),
    ...overrides,
  };
}

// ─── Async Retry Helper ─────────────────────────────────────────────────────

/**
 * Retry an async operation up to `maxAttempts` times with exponential backoff.
 * Useful for operations that may fail due to timing (e.g., waiting for a
 * server to be ready, eventual consistency).
 */
export async function retryOnFailure<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 500,
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(
    `Operation failed after ${maxAttempts} attempts. Last error: ${lastError?.message}`,
  );
}

// ─── Condition Waiter ───────────────────────────────────────────────────────

/**
 * Poll a condition function until it returns true or the timeout expires.
 * Useful for waiting on state that isn't directly observable via Playwright
 * locators (e.g., localStorage changes, API side effects).
 */
export async function waitForCondition(
  conditionFn: () => Promise<boolean>,
  timeoutMs = 10_000,
  intervalMs = 250,
): Promise<void> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    if (await conditionFn()) return;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Condition not met within ${timeoutMs}ms`);
}

// ─── API Auth Helper ────────────────────────────────────────────────────────

/**
 * Authenticate against the mock API and return the JWT token.
 * Used by API tests that need to call protected endpoints.
 */
export async function getAuthToken(
  request: APIRequestContext,
  email = 'test@example.com',
  password = 'password123',
): Promise<string> {
  const response = await request.post(API.AUTH_LOGIN, {
    data: { email, password },
  });

  if (!response.ok()) {
    throw new Error(`Login failed with status ${response.status()}: ${await response.text()}`);
  }

  const body = await response.json();
  return body.token;
}

// ─── Date Helpers ───────────────────────────────────────────────────────────

/**
 * Return an ISO date string for N days ago. Useful for creating workouts
 * with varied dates when testing date-range filters.
 */
export function daysAgo(n: number): string {
  const date = new Date();
  date.setDate(date.getDate() - n);
  return date.toISOString();
}

/**
 * Return an ISO date string for today at midnight UTC.
 */
export function todayISO(): string {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  return now.toISOString();
}
