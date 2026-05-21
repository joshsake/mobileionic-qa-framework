/**
 * Test data constants for E2E web tests.
 *
 * These fixtures provide deterministic inputs for login, workout creation,
 * and profile update scenarios. Using constants (rather than inline strings)
 * makes it easy to update test data in one place and keeps spec files
 * focused on assertions rather than setup.
 */

// ─── User Credentials ───────────────────────────────────────────────────────

/** Valid test user seeded in the mock API */
export const VALID_USER = {
  email: 'test@example.com',
  password: 'password123',
  displayName: 'Test User',
} as const;

/** Admin user seeded in the mock API */
export const ADMIN_USER = {
  email: 'admin@example.com',
  password: 'password123',
  displayName: 'Admin User',
} as const;

/** Secondary user seeded in the mock API */
export const SECONDARY_USER = {
  email: 'user2@example.com',
  password: 'password123',
  displayName: 'Jane Doe',
} as const;

/** Credentials that should always fail authentication */
export const INVALID_USER = {
  email: 'nonexistent@example.com',
  password: 'wrongpassword',
} as const;

/** Valid email but wrong password — tests the password-check branch */
export const WRONG_PASSWORD = {
  email: 'test@example.com',
  password: 'notthepassword',
} as const;

// ─── Workout Templates ──────────────────────────────────────────────────────

export const WORKOUT_TEMPLATES = {
  RUNNING: {
    exerciseType: 'Running',
    durationMinutes: 30,
    notes: 'Test running workout',
    date: '2025-05-10T08:00:00.000Z',
  },
  CYCLING: {
    exerciseType: 'Cycling',
    durationMinutes: 45,
    notes: 'Test cycling workout',
    date: '2025-05-11T09:00:00.000Z',
  },
  SWIMMING: {
    exerciseType: 'Swimming',
    durationMinutes: 60,
    notes: 'Test swimming workout',
    date: '2025-05-12T10:00:00.000Z',
  },
  YOGA: {
    exerciseType: 'Yoga',
    durationMinutes: 40,
    notes: 'Test yoga workout',
    date: '2025-05-13T07:00:00.000Z',
  },
  WEIGHT_TRAINING: {
    exerciseType: 'Weight Training',
    durationMinutes: 50,
    notes: 'Test weight training workout',
    date: '2025-05-14T16:00:00.000Z',
  },
} as const;

/** All valid exercise types supported by the application */
export const EXERCISE_TYPES = [
  'Running',
  'Cycling',
  'Swimming',
  'Yoga',
  'Weight Training',
] as const;

/** Boundary values for workout duration validation */
export const DURATION_BOUNDS = {
  MIN: 1,
  MAX: 1440, // 24 hours in minutes
  TYPICAL: 45,
  SHORT: 10,
  LONG: 120,
} as const;

// ─── Profile Data ───────────────────────────────────────────────────────────

export const PROFILE_UPDATES = {
  NEW_NAME: 'Updated Test User',
  ORIGINAL_NAME: 'Test User',
} as const;

// ─── Error Messages ─────────────────────────────────────────────────────────
// Expected error strings returned by the mock API and displayed in the UI.

export const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid email or password.',
  UNAUTHORIZED: 'Unauthorized. Please provide a valid Bearer token.',
  EMAIL_EXISTS: 'A user with this email already exists.',
  REQUIRED_FIELDS: 'Email and password are required.',
} as const;
