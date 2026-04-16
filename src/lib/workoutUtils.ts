import type { Workout } from './database';
import { CATEGORIES } from './types';

/** Group an array of workouts into a category-keyed object, preserving CATEGORIES order. */
export function groupWorkoutsByCategory(workouts: Workout[]): Record<string, Workout[]> {
  return CATEGORIES.reduce(
    (acc, category) => {
      const categoryWorkouts = workouts.filter((w) => w.category === category);
      if (categoryWorkouts.length > 0) {
        acc[category] = categoryWorkouts;
      }
      return acc;
    },
    {} as Record<string, Workout[]>,
  );
}

/** Tailwind classes for each workout category badge (dark-mode primary). */
export function getCategoryColor(category: string): string {
  switch (category) {
    case 'Warm-up':   return 'bg-amber-900/40 text-amber-300 dark:bg-amber-900/40 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300';
    case 'Primary':   return 'bg-stone-200 text-stone-800 dark:bg-stone-700/50 dark:text-stone-200';
    case 'Secondary': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
    case 'Additional':return 'bg-stone-100 text-stone-600 dark:bg-stone-800/60 dark:text-stone-400';
    case 'Cool-down': return 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300';
    case 'Intent':    return 'bg-amber-100 text-amber-800 dark:bg-accent dark:text-accent-foreground';
    default:          return 'bg-muted text-muted-foreground';
  }
}

/**
 * Split TSV or CSV text into headers and value rows.
 * Auto-detects delimiter from the first line.
 */
export function parseDelimited(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split('\n').filter((line) => line.trim());
  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  const headers = lines[0].split(delimiter).map((h) => h.trim());
  const rows = lines
    .slice(1)
    .map((line) => line.split(delimiter).map((v) => v.trim()))
    .filter((values) => values.length >= headers.length);
  return { headers, rows };
}

/** Map a header/value pair into a typed workout object. */
export function rowToWorkout(headers: string[], values: string[]): Omit<Workout, 'id'> {
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
        workout.description = value || undefined;
        break;
    }
  });

  return workout as Omit<Workout, 'id'>;
}

/** Return validation error strings for a workout row (1-indexed display row). */
export function validateWorkoutRow(workout: Partial<Workout>, displayRow: number): string[] {
  const errors: string[] = [];
  if (!workout.block_id)      errors.push(`Row ${displayRow}: Missing block_id`);
  if (!workout.day)           errors.push(`Row ${displayRow}: Missing day`);
  if (!workout.exercise_name) errors.push(`Row ${displayRow}: Missing exercise_name`);
  if (!workout.category)      errors.push(`Row ${displayRow}: Missing category`);
  if (!workout.type)          errors.push(`Row ${displayRow}: Missing type`);
  return errors;
}
