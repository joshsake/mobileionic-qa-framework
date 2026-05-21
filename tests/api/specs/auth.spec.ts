/**
 * Authentication API — Test Suite
 *
 * QA Strategy:
 *   Auth is the security boundary of the application. These tests verify:
 *     - Successful login returns a valid JWT with correct user metadata
 *     - Invalid credentials return 401 with a generic error (no info leak)
 *     - Registration creates a new user and returns a token
 *     - Duplicate registration is rejected with 409
 *     - Expired/invalid tokens are rejected by protected endpoints
 *
 *   All tests use Playwright's built-in APIRequestContext — no browser needed.
 */

import { test, expect } from '@playwright/test';
import { ApiClient } from '../helpers/api-client';
import { generateRandomEmail, generateRandomDisplayName } from '../../shared/test-helpers';

let client: ApiClient;

test.beforeEach(async ({ request }) => {
  client = new ApiClient(request);
});

// ─── Feature: Login ──────────────────────────────────────────────────────────

test.describe('POST /api/auth/login', () => {
  test('should return 200 and a JWT token for valid credentials', async () => {
    // GIVEN valid credentials for a seeded user
    const response = await client.login('test@example.com', 'password123');

    // THEN the response should be 200 with a token
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.token).toBeTruthy();
    expect(body.token.split('.')).toHaveLength(3); // JWT has 3 parts
    expect(body.userId).toBe(1);
    expect(body.email).toBe('test@example.com');
    expect(body.displayName).toBe('Test User');
    expect(body.expiresAt).toBeTruthy();
  });

  test('should return 401 when the email does not exist', async () => {
    // GIVEN an email that is not in the database
    const response = await client.login('nobody@example.com', 'password123');

    // THEN the response should be 401
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body.message).toContain('Invalid');
  });

  test('should return 401 when the password is incorrect', async () => {
    // GIVEN a valid email but wrong password
    const response = await client.login('test@example.com', 'wrongpassword');

    // THEN the response should be 401 with the same generic message
    // (prevents user enumeration — same error for bad email vs bad password)
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body.message).toContain('Invalid');
  });

  test('should return 400 when email or password is missing', async () => {
    // GIVEN a request with no password
    const response = await client.login('test@example.com', '');

    // THEN the response should indicate a validation error
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});

// ─── Feature: Registration ──────────────────────────────────────────────────

test.describe('POST /api/auth/register', () => {
  test('should return 201 and a JWT token for a new user', async () => {
    // GIVEN a unique email for registration
    const email = generateRandomEmail();
    const displayName = generateRandomDisplayName();

    const response = await client.register(email, 'securepass123', displayName);

    // THEN the response should be 201 with a valid token
    expect(response.status()).toBe(201);

    const body = await response.json();
    expect(body.token).toBeTruthy();
    expect(body.email).toBe(email);
    expect(body.displayName).toBe(displayName);
    expect(body.userId).toBeTruthy();
  });

  test('should return 409 when registering with an existing email', async () => {
    // GIVEN an email that already exists in the database
    const response = await client.register(
      'test@example.com',
      'password123',
      'Duplicate User',
    );

    // THEN the response should be 409 Conflict
    expect(response.status()).toBe(409);

    const body = await response.json();
    expect(body.message).toContain('already exists');
  });

  test('should return 400 when required fields are missing', async () => {
    // GIVEN a registration request missing the displayName
    const response = await client.register(
      generateRandomEmail(),
      'password123',
      '', // empty displayName
    );

    // THEN the response should indicate a validation error
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});

// ─── Feature: Token Expiry / Invalid Token ──────────────────────────────────

test.describe('Token Validation', () => {
  test('should reject requests with an invalid token', async () => {
    // GIVEN a deliberately malformed JWT
    client.setToken('invalid.jwt.token');

    // WHEN calling a protected endpoint
    const response = await client.getWorkouts();

    // THEN the response should be 401
    expect(response.status()).toBe(401);
  });

  test('should reject requests with no token', async () => {
    // GIVEN no authentication
    client.setToken(null);

    // WHEN calling a protected endpoint
    const response = await client.getWorkouts();

    // THEN the response should be 401
    expect(response.status()).toBe(401);
  });

  test('should accept requests with a valid token obtained from login', async () => {
    // GIVEN a freshly obtained token
    await client.login('test@example.com', 'password123');

    // WHEN calling a protected endpoint
    const response = await client.getWorkouts();

    // THEN the response should be 200
    expect(response.status()).toBe(200);
  });
});
