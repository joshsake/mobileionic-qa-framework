/**
 * JSON Schema definitions for workout API responses.
 *
 * QA Strategy:
 *   Schema validation is a form of contract testing — it ensures the API
 *   response structure matches what the frontend expects. These schemas
 *   are validated using ajv in the contract spec tests. If a backend
 *   change adds, removes, or renames a field, the contract tests will
 *   catch the breaking change before it reaches the UI.
 *
 *   Schemas mirror the C# Workout model in api/dotnet-api/Models/Workout.cs.
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

// ─── Single Workout Response Schema ─────────────────────────────────────────

export interface WorkoutSchema {
  id: number;
  userId: number;
  exerciseType: string;
  durationMinutes: number;
  notes: string | null;
  date: string;
  createdAt: string;
}

/**
 * Schema for a single workout object returned by GET /api/workouts/:id
 * or as an element in the GET /api/workouts array.
 */
export const workoutSchema: Schema = {
  type: 'object',
  properties: {
    id: { type: 'number' },
    userId: { type: 'number' },
    exerciseType: {
      type: 'string',
      enum: ['Running', 'Cycling', 'Swimming', 'Yoga', 'Weight Training'],
    },
    durationMinutes: {
      type: 'number',
      minimum: 1,
      maximum: 1440,
    },
    notes: { type: 'string', nullable: true },
    date: { type: 'string', format: 'date-time' },
    createdAt: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'userId', 'exerciseType', 'durationMinutes', 'notes', 'date', 'createdAt'],
  additionalProperties: true, // Allow extra fields without failing
};

// ─── Workout List Response Schema ───────────────────────────────────────────

/**
 * Schema for the array returned by GET /api/workouts.
 */
export const workoutListSchema: Schema = {
  type: 'array',
  items: workoutSchema,
};

// ─── Workout Creation Request Schema ────────────────────────────────────────
// (Used to validate that test data matches the expected request shape)

export interface WorkoutCreateRequest {
  exerciseType: string;
  durationMinutes: number;
  notes?: string;
  date: string;
}

export const workoutCreateSchema: Schema = {
  type: 'object',
  properties: {
    exerciseType: { type: 'string' },
    durationMinutes: { type: 'number', minimum: 1, maximum: 1440 },
    notes: { type: 'string', nullable: true },
    date: { type: 'string' },
  },
  required: ['exerciseType', 'durationMinutes', 'date'],
  additionalProperties: true,
};
