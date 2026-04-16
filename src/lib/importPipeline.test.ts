import { describe, it, expect } from 'vitest';
import { parseDelimited, rowToWorkout, validateWorkoutRow } from './workoutUtils';

/**
 * End-to-end tests for the TSV import pipeline:
 * raw text → parseDelimited → rowToWorkout → validateWorkoutRow
 * Covers the full flow a user triggers when importing a .tsv file.
 */

const SAMPLE_TSV = [
  'block_id\tday\texercise_name\tcategory\ttype\tsets\treps\tweight\tduration\trest\tcues\tguidance\tresistance\tdescription',
  'Week 1\tDay 1\tFocus\tIntent\tmindset\t1\t\t\t2\t0\tBuild power today\t\t\t',
  'Week 1\tDay 1\tSquats\tPrimary\tweights\t3\t10\t100\t\t90\tDrive through heels\t70% 1RM\t\tFeet shoulder-width apart',
  'Week 1\tDay 1\tBand Pull\tAdditional\tweights\t3\t15\t\t\t60\tSqueeze at top\t\tRed band\t',
  'Week 1\tDay 2\tPlank\tPrimary\ttime\t3\t\t\t1.5\t30\tKeep hips level\t\t\t',
  'Week 2\tDay 1\tDeadlift\tPrimary\tweights\t4\t5\t140\t\t120\tFlat back\t80% 1RM\t\t',
].join('\n');

describe('TSV import pipeline — full flow', () => {
  it('parses a complete TSV into correct number of workouts', () => {
    const { headers, rows } = parseDelimited(SAMPLE_TSV);
    expect(headers).toHaveLength(14); // all columns including optional
    expect(rows).toHaveLength(5); // 5 data rows
  });

  it('produces valid workout objects from every row', () => {
    const { headers, rows } = parseDelimited(SAMPLE_TSV);
    const workouts = rows.map((values) => rowToWorkout(headers, values));
    const allErrors = workouts.flatMap((w, i) => validateWorkoutRow(w, i + 2));
    expect(allErrors).toEqual([]); // zero validation errors
  });

  it('extracts unique block IDs for block creation', () => {
    const { headers, rows } = parseDelimited(SAMPLE_TSV);
    const workouts = rows.map((values) => rowToWorkout(headers, values));
    const blockIds = new Set(workouts.map((w) => w.block_id));
    expect(blockIds).toEqual(new Set(['Week 1', 'Week 2']));
  });

  it('correctly maps numeric fields across exercise types', () => {
    const { headers, rows } = parseDelimited(SAMPLE_TSV);
    const workouts = rows.map((values) => rowToWorkout(headers, values));

    // Weights exercise — has reps and weight
    const squats = workouts.find((w) => w.exercise_name === 'Squats')!;
    expect(squats.sets).toBe(3);
    expect(squats.reps).toBe(10);
    expect(squats.weight).toBe(100);
    expect(squats.rest).toBe(90);
    expect(squats.duration).toBeUndefined();

    // Time exercise — has duration, no reps/weight
    const plank = workouts.find((w) => w.exercise_name === 'Plank')!;
    expect(plank.sets).toBe(3);
    expect(plank.duration).toBe(1.5);
    expect(plank.reps).toBeUndefined();
    expect(plank.weight).toBeUndefined();

    // Mindset exercise — minimal fields
    const focus = workouts.find((w) => w.exercise_name === 'Focus')!;
    expect(focus.sets).toBe(1);
    expect(focus.type).toBe('mindset');
    expect(focus.category).toBe('Intent');
  });

  it('preserves optional text fields — guidance, resistance, description', () => {
    const { headers, rows } = parseDelimited(SAMPLE_TSV);
    const workouts = rows.map((values) => rowToWorkout(headers, values));

    const squats = workouts.find((w) => w.exercise_name === 'Squats')!;
    expect(squats.guidance).toBe('70% 1RM');
    expect(squats.description).toBe('Feet shoulder-width apart');
    expect(squats.resistance).toBeUndefined(); // empty → undefined

    const bandPull = workouts.find((w) => w.exercise_name === 'Band Pull')!;
    expect(bandPull.resistance).toBe('Red band');
    expect(bandPull.guidance).toBeUndefined();
  });

  it('collects days per block for session navigation', () => {
    const { headers, rows } = parseDelimited(SAMPLE_TSV);
    const workouts = rows.map((values) => rowToWorkout(headers, values));

    const week1Days = [...new Set(workouts.filter((w) => w.block_id === 'Week 1').map((w) => w.day))].sort();
    expect(week1Days).toEqual(['Day 1', 'Day 2']);

    const week2Days = [...new Set(workouts.filter((w) => w.block_id === 'Week 2').map((w) => w.day))].sort();
    expect(week2Days).toEqual(['Day 1']);
  });

  it('rejects rows with missing required fields', () => {
    const badTsv = 'block_id\tday\texercise_name\tcategory\ttype\n\t\tSquats\t\t';
    const { headers, rows } = parseDelimited(badTsv);
    const workout = rowToWorkout(headers, rows[0]);
    const errors = validateWorkoutRow(workout, 2);
    expect(errors).toContain('Row 2: Missing block_id');
    expect(errors).toContain('Row 2: Missing day');
    expect(errors).toContain('Row 2: Missing category');
    expect(errors).toContain('Row 2: Missing type');
    expect(errors).not.toContain('Row 2: Missing exercise_name'); // Squats is present
  });

  it('handles CSV format as well as TSV', () => {
    const csv = 'block_id,day,exercise_name,category,type,sets,rest,cues\nWeek 1,Day 1,Squats,Primary,weights,3,90,Heels';
    const { headers, rows } = parseDelimited(csv);
    const workout = rowToWorkout(headers, rows[0]);
    expect(workout.block_id).toBe('Week 1');
    expect(workout.exercise_name).toBe('Squats');
    expect(validateWorkoutRow(workout, 2)).toEqual([]);
  });
});
