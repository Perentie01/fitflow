import { describe, it, expect } from 'vitest';
import { parseDelimited, rowToWorkout, validateWorkoutRow, validateWorkoutStrict, groupWorkoutsByCategory } from './workoutUtils';
import type { StoredWorkout } from './types';
import { CATEGORIES, WorkoutSchema } from './types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const workout = (overrides: Partial<StoredWorkout> = {}): StoredWorkout => ({
  id: 1,
  block_id: 'Week 1',
  day: 'Day 1',
  exercise_name: 'Squats',
  category: 'Primary',
  type: 'weights',
  sets: 3,
  reps: 10,
  weight: 100,
  rest: 90,
  cues: 'Drive through heels',
  ...overrides,
});

// ---------------------------------------------------------------------------
// parseDelimited
// ---------------------------------------------------------------------------
describe('parseDelimited', () => {
  it('auto-detects tab delimiter from first line', () => {
    const input = 'block_id\tday\texercise_name\nWeek 1\tDay 1\tSquats';
    const { headers, rows } = parseDelimited(input);
    expect(headers).toEqual(['block_id', 'day', 'exercise_name']);
    expect(rows[0]).toEqual(['Week 1', 'Day 1', 'Squats']);
  });

  it('auto-detects comma delimiter from first line', () => {
    const input = 'block_id,day,exercise_name\nWeek 1,Day 1,Squats';
    const { headers } = parseDelimited(input);
    expect(headers).toEqual(['block_id', 'day', 'exercise_name']);
  });

  it('filters rows with fewer columns than headers', () => {
    const input = 'a\tb\tc\n1\t2\t3\nshort';
    const { rows } = parseDelimited(input);
    expect(rows).toHaveLength(1);
  });

  it('strips whitespace from headers and values', () => {
    const input = ' block_id \t day \n Week 1 \t Day 1 ';
    const { headers, rows } = parseDelimited(input);
    expect(headers).toEqual(['block_id', 'day']);
    expect(rows[0]).toEqual(['Week 1', 'Day 1']);
  });

  it('skips blank lines', () => {
    const input = 'a\tb\n\n1\t2\n\n3\t4';
    const { rows } = parseDelimited(input);
    expect(rows).toHaveLength(2);
  });

  it('returns empty rows for header-only input', () => {
    const input = 'a\tb\tc';
    const { headers, rows } = parseDelimited(input);
    expect(headers).toHaveLength(3);
    expect(rows).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// rowToWorkout
// ---------------------------------------------------------------------------
describe('rowToWorkout', () => {
  const headers = ['block_id', 'day', 'exercise_name', 'category', 'type', 'sets', 'reps', 'weight', 'rest'];

  it('maps string values to typed workout fields', () => {
    const values = ['Week 1', 'Day 1', 'Squats', 'Primary', 'weights', '3', '10', '100', '90'];
    const w = rowToWorkout(headers, values);
    expect(w.block_id).toBe('Week 1');
    expect(w.sets).toBe(3);
    expect(w.weight).toBe(100);
    expect(w.rest).toBe(90);
  });

  it('returns undefined for reps and weight when input is empty string', () => {
    const values = ['Week 1', 'Day 1', 'Plank', 'Primary', 'time', '3', '', '', '60'];
    const w = rowToWorkout(headers, values);
    expect(w.reps).toBeUndefined();
    expect(w.weight).toBeUndefined();
  });

  it('defaults sets to 1 when value is not a number', () => {
    const values = ['W1', 'D1', 'Run', 'Primary', 'time', 'abc', '', '', '0'];
    const w = rowToWorkout(headers, values);
    expect(w.sets).toBe(1);
  });

  it('defaults rest to 0 when value is not a number', () => {
    const values = ['W1', 'D1', 'Run', 'Primary', 'time', '1', '', '', 'nope'];
    const w = rowToWorkout(headers, values);
    expect(w.rest).toBe(0);
  });

  it('accepts week_id as alias for block_id', () => {
    const w = rowToWorkout(['week_id'], ['Block A']);
    expect(w.block_id).toBe('Block A');
  });

  it('parses float weight values', () => {
    const w = rowToWorkout(['weight'], ['22.5']);
    expect(w.weight).toBe(22.5);
  });

  it('parses float duration values', () => {
    const w = rowToWorkout(['duration'], ['1.5']);
    expect(w.duration).toBe(1.5);
  });

  it('handles optional text fields — guidance, resistance, description', () => {
    const h = ['guidance', 'resistance', 'description'];
    const w = rowToWorkout(h, ['70% 1RM', 'Red band', 'Stand tall']);
    expect(w.guidance).toBe('70% 1RM');
    expect(w.resistance).toBe('Red band');
    expect(w.description).toBe('Stand tall');
  });

  it('returns undefined for optional text fields when empty', () => {
    const h = ['guidance', 'resistance', 'description'];
    const w = rowToWorkout(h, ['', '', '']);
    expect(w.guidance).toBeUndefined();
    expect(w.resistance).toBeUndefined();
    expect(w.description).toBeUndefined();
  });

  it('parses distance field for cardio workouts', () => {
    const w = rowToWorkout(['distance'], ['5.0']);
    expect(w.distance).toBe(5.0);
  });
});

// ---------------------------------------------------------------------------
// validateWorkoutRow (loose / import validation via Zod)
// ---------------------------------------------------------------------------
describe('validateWorkoutRow', () => {
  it('returns empty array for a complete workout', () => {
    const w = { block_id: 'W1', day: 'D1', exercise_name: 'Squat', category: 'Primary' as const, type: 'weights' as const, sets: 3, rest: 60, cues: '' };
    expect(validateWorkoutRow(w, 1)).toEqual([]);
  });

  it('reports errors for missing required fields', () => {
    const errors = validateWorkoutRow({}, 1);
    expect(errors.length).toBeGreaterThan(0);
    // Should mention missing fields
    expect(errors.some(e => e.includes('block_id'))).toBe(true);
    expect(errors.some(e => e.includes('day'))).toBe(true);
    expect(errors.some(e => e.includes('exercise_name'))).toBe(true);
  });

  it('includes the display row number in each error message', () => {
    const errors = validateWorkoutRow({}, 7);
    errors.forEach((e) => expect(e).toContain('Row 7'));
  });

  it('rejects invalid category values', () => {
    const w = { block_id: 'W1', day: 'D1', exercise_name: 'X', category: 'Invalid' as any, type: 'weights' as const, sets: 3, rest: 60, cues: '' };
    const errors = validateWorkoutRow(w, 1);
    expect(errors.some(e => e.includes('category'))).toBe(true);
  });

  it('rejects invalid exercise type values', () => {
    const w = { block_id: 'W1', day: 'D1', exercise_name: 'X', category: 'Primary' as const, type: 'invalid' as any, sets: 3, rest: 60, cues: '' };
    const errors = validateWorkoutRow(w, 1);
    expect(errors.some(e => e.includes('type'))).toBe(true);
  });

  it('does not flag missing optional fields', () => {
    const w = { block_id: 'W1', day: 'D1', exercise_name: 'X', category: 'Primary' as const, type: 'weights' as const, sets: 3, rest: 60, cues: '' };
    // no reps, weight, duration, guidance, etc.
    expect(validateWorkoutRow(w, 1)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// validateWorkoutStrict (discriminated union via Zod)
// ---------------------------------------------------------------------------
describe('validateWorkoutStrict', () => {
  it('accepts a valid weights workout with reps', () => {
    const result = validateWorkoutStrict({
      block_id: 'W1', day: 'D1', exercise_name: 'Squats',
      category: 'Primary', type: 'weights',
      sets: 3, reps: 10, weight: 100, rest: 90, cues: 'Drive through heels',
    });
    expect(result.success).toBe(true);
  });

  it('rejects weights workout without reps', () => {
    const result = validateWorkoutStrict({
      block_id: 'W1', day: 'D1', exercise_name: 'Squats',
      category: 'Primary', type: 'weights',
      sets: 3, weight: 100, rest: 90, cues: '',
    });
    expect(result.success).toBe(false);
  });

  it('accepts weights workout without weight (bodyweight)', () => {
    const result = validateWorkoutStrict({
      block_id: 'W1', day: 'D1', exercise_name: 'Push-ups',
      category: 'Primary', type: 'weights',
      sets: 3, reps: 20, rest: 60, cues: '',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a valid time workout with duration', () => {
    const result = validateWorkoutStrict({
      block_id: 'W1', day: 'D1', exercise_name: 'Plank',
      category: 'Primary', type: 'time',
      sets: 3, duration: 1.5, rest: 60, cues: '',
    });
    expect(result.success).toBe(true);
  });

  it('rejects time workout without duration', () => {
    const result = validateWorkoutStrict({
      block_id: 'W1', day: 'D1', exercise_name: 'Plank',
      category: 'Primary', type: 'time',
      sets: 3, rest: 60, cues: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects time workout with reps', () => {
    const result = validateWorkoutStrict({
      block_id: 'W1', day: 'D1', exercise_name: 'Plank',
      category: 'Primary', type: 'time',
      sets: 3, duration: 1.5, reps: 10, rest: 60, cues: '',
    });
    expect(result.success).toBe(false);
  });

  it('accepts a valid mindset workout', () => {
    const result = validateWorkoutStrict({
      block_id: 'W1', day: 'D1', exercise_name: 'Focus',
      category: 'Intent', type: 'mindset',
      sets: 1, duration: 2, rest: 0, cues: 'Visualize success',
    });
    expect(result.success).toBe(true);
  });

  it('accepts mindset workout without duration', () => {
    const result = validateWorkoutStrict({
      block_id: 'W1', day: 'D1', exercise_name: 'Focus',
      category: 'Intent', type: 'mindset',
      sets: 1, rest: 0, cues: 'Visualize success',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a valid cardio workout', () => {
    const result = validateWorkoutStrict({
      block_id: 'W1', day: 'D1', exercise_name: '5K Run',
      category: 'Primary', type: 'cardio',
      sets: 1, duration: 30, distance: 5, rest: 0, cues: 'Steady pace',
    });
    expect(result.success).toBe(true);
  });

  it('accepts cardio workout with only duration', () => {
    const result = validateWorkoutStrict({
      block_id: 'W1', day: 'D1', exercise_name: 'Easy Run',
      category: 'Warm-up', type: 'cardio',
      sets: 1, duration: 15, rest: 0, cues: '',
    });
    expect(result.success).toBe(true);
  });

  it('rejects cardio workout with reps', () => {
    const result = validateWorkoutStrict({
      block_id: 'W1', day: 'D1', exercise_name: 'Run',
      category: 'Primary', type: 'cardio',
      sets: 1, duration: 30, reps: 10, rest: 0, cues: '',
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// groupWorkoutsByCategory
// ---------------------------------------------------------------------------
describe('groupWorkoutsByCategory', () => {
  it('groups workouts under their category key', () => {
    const grouped = groupWorkoutsByCategory([
      workout({ category: 'Primary' }),
      workout({ category: 'Primary' }),
      workout({ category: 'Warm-up' }),
    ]);
    expect(grouped['Primary']).toHaveLength(2);
    expect(grouped['Warm-up']).toHaveLength(1);
  });

  it('omits categories with zero workouts', () => {
    const grouped = groupWorkoutsByCategory([workout({ category: 'Primary' })]);
    expect(Object.keys(grouped)).toEqual(['Primary']);
  });

  it('preserves CATEGORIES order in output keys', () => {
    // Input in reverse order — output should still match CATEGORIES order
    const grouped = groupWorkoutsByCategory([
      workout({ category: 'Cool-down' }),
      workout({ category: 'Warm-up' }),
      workout({ category: 'Primary' }),
    ]);
    const keys = Object.keys(grouped);
    const expected = CATEGORIES.filter((c) => keys.includes(c));
    expect(keys).toEqual(expected);
  });

  it('returns empty object for empty input', () => {
    expect(groupWorkoutsByCategory([])).toEqual({});
  });
});
