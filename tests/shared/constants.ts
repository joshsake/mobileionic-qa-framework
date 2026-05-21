/**
 * Shared constants used across both E2E web tests and API tests.
 *
 * Centralizing URLs, timeouts, and selectors here prevents magic strings
 * from scattering across spec files and makes environment changes a
 * single-file update.
 */

// ─── URLs ────────────────────────────────────────────────────────────────────

export const URLS = {
  /** Ionic dev server base URL */
  WEB_BASE: process.env.WEB_BASE_URL || 'http://localhost:8100',

  /** Mock API server base URL */
  API_BASE: process.env.API_BASE_URL || 'http://localhost:3000',

  /** App routes — must match app/src/app/app.routes.ts */
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  WORKOUTS: '/workouts',
  ADD_WORKOUT: '/workouts/add',
  HISTORY: '/history',
  PROFILE: '/profile',
} as const;

// ─── API Endpoints ──────────────────────────────────────────────────────────

export const API = {
  AUTH_LOGIN: '/api/auth/login',
  AUTH_REGISTER: '/api/auth/register',
  WORKOUTS: '/api/workouts',
  PROFILE: '/api/profile',
  ANALYTICS_SUMMARY: '/api/analytics/summary',
} as const;

// ─── Timeouts (milliseconds) ────────────────────────────────────────────────

export const TIMEOUTS = {
  /** Default element wait — generous for Ionic's Angular rendering */
  ELEMENT: 10_000,

  /** Navigation wait — pages may lazy-load Angular modules */
  NAVIGATION: 30_000,

  /** Short wait for animations and transitions */
  ANIMATION: 2_000,

  /** Network idle wait */
  NETWORK_IDLE: 5_000,

  /** Toast/snackbar auto-dismiss */
  TOAST: 4_000,
} as const;

// ─── Test-ID Selectors ──────────────────────────────────────────────────────
// These map to data-testid attributes set in the Ionic app components.

export const SELECTORS = {
  // Login page
  LOGIN_TITLE: '[data-testid="login-title"]',
  LOGIN_CARD: '[data-testid="login-card"]',
  LOGIN_CARD_TITLE: '[data-testid="login-card-title"]',
  LOGIN_EMAIL_INPUT: '[data-testid="login-email-input"]',
  LOGIN_PASSWORD_INPUT: '[data-testid="login-password-input"]',
  LOGIN_SUBMIT_BTN: '[data-testid="login-submit-btn"]',
  LOGIN_ERROR_MESSAGE: '[data-testid="login-error-message"]',

  // Dashboard
  DASHBOARD_TITLE: '[data-testid="dashboard-title"]',
  DASHBOARD_STATS: '[data-testid="dashboard-stats"]',

  // Workouts list
  WORKOUT_LIST: '[data-testid="workout-list"]',
  WORKOUT_ITEM: '[data-testid="workout-item"]',
  WORKOUT_ADD_BTN: '[data-testid="workout-add-btn"]',
  WORKOUT_SEARCH: '[data-testid="workout-search"]',
  WORKOUT_COUNT: '[data-testid="workout-count"]',

  // Add workout form
  EXERCISE_TYPE_SELECT: '[data-testid="exercise-type-select"]',
  DURATION_INPUT: '[data-testid="duration-input"]',
  NOTES_INPUT: '[data-testid="notes-input"]',
  DATE_INPUT: '[data-testid="date-input"]',
  WORKOUT_SUBMIT_BTN: '[data-testid="workout-submit-btn"]',
  VALIDATION_ERROR: '[data-testid="validation-error"]',

  // Profile
  PROFILE_NAME: '[data-testid="profile-name"]',
  PROFILE_EMAIL: '[data-testid="profile-email"]',
  PROFILE_NAME_INPUT: '[data-testid="profile-name-input"]',
  PROFILE_SAVE_BTN: '[data-testid="profile-save-btn"]',

  // Navigation
  TAB_BAR: 'ion-tab-bar',
  TAB_DASHBOARD: '[data-testid="tab-dashboard"]',
  TAB_WORKOUTS: '[data-testid="tab-workouts"]',
  TAB_HISTORY: '[data-testid="tab-history"]',
  TAB_PROFILE: '[data-testid="tab-profile"]',
  BACK_BUTTON: 'ion-back-button',
  LOGOUT_BTN: '[data-testid="logout-btn"]',
} as const;

// ─── Viewport Presets ───────────────────────────────────────────────────────

export const VIEWPORTS = {
  MOBILE: { width: 393, height: 851 },      // Pixel 5
  TABLET: { width: 768, height: 1024 },     // iPad Mini
  LANDSCAPE: { width: 851, height: 393 },   // Pixel 5 rotated
} as const;
