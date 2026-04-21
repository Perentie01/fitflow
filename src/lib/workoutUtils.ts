import { z } from 'zod';
import type { StoredWorkout, WorkoutRow, Workout } from './types';
import { CATEGORIES, WorkoutRowSchema, WorkoutSchema } from './types';

/** Group an array of workouts into a category-keyed object, preserving CATEGORIES order. */
export function groupWorkoutsByCategory(workouts: StoredWorkout[]): Record<string, StoredWorkout[]> {
  return CATEGORIES.reduce(
    (acc, category) => {
      const categoryWorkouts = workouts.filter((w) => w.category === category);
      if (categoryWorkouts.length > 0) {
        acc[category] = categoryWorkouts;
      }
      return acc;
    },
    {} as Record<string, StoredWorkout[]>,
  );
}

/** Tailwind classes for each workout category badge.
 *  Uses design-system tokens only — no arbitrary Tailwind colors.
 *  Intent gets the amber accent; everything else uses muted/secondary. */
export function getCategoryColor(category: string): string {
  switch (category) {
    case 'Intent':    return 'bg-accent text-accent-foreground';
    case 'Primary':   return 'bg-secondary text-secondary-foreground';
    case 'Warm-up':
    case 'Secondary':
    case 'Additional':
    case 'Cool-down':
    default:          return 'bg-muted text-muted-foreground';
  }
}

/** Split TSV text into headers and value rows. */
export function parseDelimited(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split('\n').filter((line) => line.trim());
  const headers = lines[0].split('\t').map((h) => h.trim());
  const rows = lines
    .slice(1)
    .map((line) => line.split('\t').map((v) => v.trim()))
    .filter((values) => values.length >= headers.length);
  return { headers, rows };
}

/** Map a header/value pair into a loosely-typed workout row object. */
export function rowToWorkout(headers: string[], values: string[]): WorkoutRow {
  const workout: Record<string, unknown> = {};

  headers.forEach((header, index) => {
    const value = values[index] ?? '';
    switch (header.toLowerCase()) {
      case 'block_id':
      case 'week_id':
        workout.block_id = value;
        break;
      case 'day':
        workout.day = value;
        break;
      case 'exercise_name':
        workout.exercise_name = value;
        break;
      case 'category':
        workout.category = value;
        break;
      case 'type':
        workout.type = value;
        break;
      case 'sets':
        workout.sets = parseInt(value) || 1;
        break;
      case 'reps':
        workout.reps = value ? parseInt(value) : undefined;
        break;
      case 'weight': {
        const n = parseFloat(value);
        workout.weight = !isNaN(n) ? n : undefined;
        break;
      }
      case 'duration':
        workout.duration = value ? parseFloat(value) : undefined;
        break;
      case 'distance':
        workout.distance = value ? parseFloat(value) : undefined;
        break;
      case 'rest':
        workout.rest = parseInt(value) || 0;
        break;
      case 'cues':
        workout.cues = value || '';
        break;
      case 'guidance':
        workout.guidance = value || undefined;
        break;
      case 'resistance':
        workout.resistance = value || undefined;
        break;
      case 'description':
        workout.description = value ? value.replace(/\\n/g, '\n') : undefined;
        break;
    }
  });

  return workout as WorkoutRow;
}

/** Return validation error strings for a workout row (1-indexed display row). */
export function validateWorkoutRow(workout: Partial<WorkoutRow>, displayRow: number): string[] {
  const result = WorkoutRowSchema.safeParse(workout);
  if (result.success) return [];

  return result.error.issues.map((issue) => {
    const field = issue.path.join('.');
    if (issue.code === z.ZodIssueCode.invalid_type && issue.received === 'undefined') {
      return `Row ${displayRow}: Missing ${field}`;
    }
    if (issue.code === z.ZodIssueCode.too_small && issue.minimum === 1 && issue.type === 'string') {
      return `Row ${displayRow}: Missing ${field}`;
    }
    return `Row ${displayRow}: ${field} — ${issue.message}`;
  });
}

/**
 * Validate a workout row against the strict discriminated union schema.
 * Returns typed errors for type-specific field requirements (e.g. reps for weights).
 */
export function validateWorkoutStrict(workout: unknown): z.SafeParseReturnType<unknown, Workout> {
  return WorkoutSchema.safeParse(workout);
}
