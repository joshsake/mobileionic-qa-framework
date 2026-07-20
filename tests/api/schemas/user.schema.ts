/**
 * JSON Schema definitions for user/auth API responses.
 *
 * QA Strategy:
 *   These schemas validate the authentication response contract (JWT token
 *   structure, user profile fields). This is especially important because:
 *     - The frontend stores the token and userId from the login response
 *     - Any field name changes would break the AuthService
 *     - The profile endpoint omits passwordHash — we verify this security
 *       property in the schema
 *
 *   Schemas mirror the C# models in api/dotnet-api/Models/.
 */

/*
 * These are annotated as ajv's `Schema` rather than `Schema`.
 * JSONSchemaType cannot express a nullable property whose TypeScript type is a
 * `string | null` union - it demands `nullable: false` for a `type: 'string'`
 * entry - so `notes` made the whole schema fail to compile. Runtime validation
 * is identical either way; the interfaces below still document the shape and
 * are what the specs assert against.
 */
import type { Schema } from 'ajv';

// ─── Login Response Schema ──────────────────────────────────────────────────

export interface LoginResponseSchema {
  token: string;
  expiresAt: string;
  userId: number;
  displayName: string;
  email: string;
}

/**
 * Schema for the response from POST /api/auth/login and POST /api/auth/register.
 * Validates that the JWT token and user metadata are present.
 */
export const loginResponseSchema: Schema = {
  type: 'object',
  properties: {
    token: { type: 'string', minLength: 10 },
    expiresAt: { type: 'string' },
    userId: { type: 'number' },
    displayName: { type: 'string', minLength: 1 },
    email: { type: 'string', format: 'email' },
  },
  required: ['token', 'expiresAt', 'userId', 'displayName', 'email'],
  additionalProperties: true,
};

// ─── User Profile Response Schema ───────────────────────────────────────────

export interface UserProfileSchema {
  id: number;
  email: string;
  displayName: string;
  createdAt: string;
}

/**
 * Schema for the response from GET /api/profile.
 * Note: passwordHash must NOT be present — this is a security assertion.
 */
export const userProfileSchema: Schema = {
  type: 'object',
  properties: {
    id: { type: 'number' },
    email: { type: 'string', format: 'email' },
    displayName: { type: 'string', minLength: 1 },
    createdAt: { type: 'string' },
  },
  required: ['id', 'email', 'displayName', 'createdAt'],
  additionalProperties: false, // Reject unexpected fields like passwordHash
};

// ─── Error Response Schema ──────────────────────────────────────────────────

export interface ErrorResponseSchema {
  message: string;
}

/**
 * Schema for error responses (401, 409, etc.).
 * All error responses should include a human-readable message.
 */
export const errorResponseSchema: Schema = {
  type: 'object',
  properties: {
    message: { type: 'string', minLength: 1 },
  },
  required: ['message'],
  additionalProperties: true,
};
