/**
 * Typed API Client — wraps Playwright's APIRequestContext for the Fitness Tracker API.
 *
 * QA Strategy:
 *   This client provides typed methods for every API endpoint so that spec
 *   files can call `client.createWorkout(data)` instead of manually building
 *   fetch requests. Benefits:
 *     - Auth token management is handled internally (login once, reuse token)
 *     - Response types give IDE autocompletion in spec files
 *     - Centralized error handling makes debugging faster
 *
 *   The client does NOT assert on responses — that responsibility stays in
 *   the spec files. This keeps the client reusable for both positive and
 *   negative test scenarios.
 */

import { type APIRequestContext, type APIResponse } from '@playwright/test';
import { API } from '../../shared/constants';

// ─── Response Types ─────────────────────────────────────────────────────────

export interface LoginResponse {
  token: string;
  expiresAt: string;
  userId: number;
  displayName: string;
  email: string;
}

export interface WorkoutResponse {
  id: number;
  userId: number;
  exerciseType: string;
  durationMinutes: number;
  notes: string | null;
  date: string;
  createdAt: string;
}

export interface UserProfile {
  id: number;
  email: string;
  displayName: string;
  createdAt: string;
}

export interface AnalyticsSummary {
  userId: number;
  totalWorkouts: number;
  totalMinutes: number;
  averageDuration: number;
  workoutsByType: Record<string, number>;
  weeklyBreakdown: Array<{ week: string; workouts: number; minutes: number }>;
  streak: number;
  lastWorkoutDate: string | null;
}

export interface ErrorResponse {
  message: string;
}

// ─── API Client Class ───────────────────────────────────────────────────────

export class ApiClient {
  private token: string | null = null;

  constructor(private readonly request: APIRequestContext) {}

  // ─── Auth ──────────────────────────────────────────────────────────────

  /**
   * Authenticate and store the JWT token for subsequent requests.
   * Returns the full login response for assertions in spec files.
   */
  async login(
    email = 'test@example.com',
    password = 'password123',
  ): Promise<APIResponse> {
    const response = await this.request.post(API.AUTH_LOGIN, {
      data: { email, password },
    });

    if (response.ok()) {
      const body: LoginResponse = await response.json();
      this.token = body.token;
    }

    return response;
  }

  /**
   * Register a new user account.
   * On success the token is stored for subsequent requests.
   */
  async register(
    email: string,
    password: string,
    displayName: string,
  ): Promise<APIResponse> {
    const response = await this.request.post(API.AUTH_REGISTER, {
      data: { email, password, displayName },
    });

    if (response.ok()) {
      const body: LoginResponse = await response.json();
      this.token = body.token;
    }

    return response;
  }

  /**
   * Set the auth token directly (e.g., for testing with a specific token
   * or testing expired token scenarios).
   */
  setToken(token: string | null): void {
    this.token = token;
  }

  /** Return the current auth token, or null if not authenticated. */
  getToken(): string | null {
    return this.token;
  }

  // ─── Private: Auth Headers ─────────────────────────────────────────────

  private get authHeaders(): Record<string, string> {
    if (!this.token) return {};
    return { Authorization: `Bearer ${this.token}` };
  }

  // ─── Workouts ──────────────────────────────────────────────────────────

  /** GET /api/workouts — list workouts for the authenticated user. */
  async getWorkouts(): Promise<APIResponse> {
    return this.request.get(API.WORKOUTS, {
      headers: this.authHeaders,
    });
  }

  /** POST /api/workouts — create a new workout. */
  async createWorkout(data: {
    exerciseType: string;
    durationMinutes: number;
    notes?: string;
    date?: string;
    userId?: number;
  }): Promise<APIResponse> {
    return this.request.post(API.WORKOUTS, {
      headers: this.authHeaders,
      data,
    });
  }

  /** PUT /api/workouts/:id — update an existing workout. */
  async updateWorkout(
    id: number,
    data: Partial<{
      exerciseType: string;
      durationMinutes: number;
      notes: string;
      date: string;
    }>,
  ): Promise<APIResponse> {
    return this.request.put(`${API.WORKOUTS}/${id}`, {
      headers: this.authHeaders,
      data,
    });
  }

  /** DELETE /api/workouts/:id — delete a workout by ID. */
  async deleteWorkout(id: number): Promise<APIResponse> {
    return this.request.delete(`${API.WORKOUTS}/${id}`, {
      headers: this.authHeaders,
    });
  }

  /** GET /api/workouts/:id — get a single workout by ID. */
  async getWorkout(id: number): Promise<APIResponse> {
    return this.request.get(`${API.WORKOUTS}/${id}`, {
      headers: this.authHeaders,
    });
  }

  // ─── Profile ───────────────────────────────────────────────────────────

  /** GET /api/profile — get the authenticated user's profile. */
  async getProfile(): Promise<APIResponse> {
    return this.request.get(API.PROFILE, {
      headers: this.authHeaders,
    });
  }

  /** PUT /api/profile — update the authenticated user's profile. */
  async updateProfile(data: { displayName?: string }): Promise<APIResponse> {
    return this.request.put(API.PROFILE, {
      headers: this.authHeaders,
      data,
    });
  }

  // ─── Analytics ─────────────────────────────────────────────────────────

  /** GET /api/analytics/summary — get workout analytics for the authenticated user. */
  async getAnalyticsSummary(): Promise<APIResponse> {
    return this.request.get(API.ANALYTICS_SUMMARY, {
      headers: this.authHeaders,
    });
  }
}
