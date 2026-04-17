import { z } from 'zod';

// Shared constants
export const APP_VERSION = 'v1.2.0';

export const CATEGORIES = [
  'Intent',
  'Warm-up',
  'Primary',
  'Secondary',
  'Additional',
  'Cool-down',
] as const;

export const CategorySchema = z.enum(CATEGORIES);
export type Category = z.infer<typeof CategorySchema>;

export const EXERCISE_TYPES = ['weights', 'time', 'mindset', 'cardio'] as const;

export const ExerciseTypeSchema = z.enum(EXERCISE_TYPES);
export type ExerciseType = z.infer<typeof ExerciseTypeSchema>;

// Base fields shared by all workout types
export const WorkoutBase = z.object({
  id: z.number().optional(),
  block_id: z.string().min(1),
  day: z.string().min(1),
  exercise_name: z.string().min(1),
  category: CategorySchema,
  sets: z.number().int().positive().default(1),
  rest: z.number().int().nonnegative().default(0),
  cues: z.string().default(''),
  guidance: z.string().optional(),
  resistance: z.string().optional(),
  // Step-by-step instructions for setting up and executing the exercise.
  // Supports multiline text with numbered steps and line breaks (\n).
  // Displayed in its own dialog when the exercise name is tapped.
  description: z.string().optional(),
});

// Weights: reps required, weight optional (bodyweight exercises), no duration
const WeightsWorkout = WorkoutBase.extend({
  type: z.literal('weights'),
  reps: z.number().int().positive(),
  weight: z.number().nonnegative().optional(),
  duration: z.undefined().optional(),
});

// Time: duration required, no reps/weight
const TimeWorkout = WorkoutBase.extend({
  type: z.literal('time'),
  duration: z.number().positive(),
  reps: z.undefined().optional(),
  weight: z.undefined().optional(),
});

// Mindset: duration optional (mental cue length), no reps/weight
const MindsetWorkout = WorkoutBase.extend({
  type: z.literal('mindset'),
  duration: z.number().positive().optional(),
  reps: z.undefined().optional(),
  weight: z.undefined().optional(),
});

// Cardio: duration and/or distance, no reps/weight
const CardioWorkout = WorkoutBase.extend({
  type: z.literal('cardio'),
  duration: z.number().positive().optional(),
  distance: z.number().positive().optional(),
  reps: z.undefined().optional(),
  weight: z.undefined().optional(),
});

export const WorkoutSchema = z.discriminatedUnion('type', [
  WeightsWorkout,
  TimeWorkout,
  MindsetWorkout,
  CardioWorkout,
]);

export type Workout = z.infer<typeof WorkoutSchema>;

// Loose schema for import validation — requires core identity fields,
// but does not enforce discriminated-union rules per type.
export const WorkoutRowSchema = WorkoutBase.extend({
  type: ExerciseTypeSchema,
  reps: z.number().int().positive().optional(),
  weight: z.number().nonnegative().optional(),
  duration: z.number().positive().optional(),
  distance: z.number().positive().optional(),
});

export type WorkoutRow = z.infer<typeof WorkoutRowSchema>;

// Flattened type for database storage — all type-specific fields optional.
// Dexie returns plain objects, so we can't narrow on discriminated unions at read time.
// `description` carries step-by-step exercise instructions (multiline, may include numbered steps).
export type StoredWorkout = z.infer<typeof WorkoutBase> & {
  type: ExerciseType;
  reps?: number;
  weight?: number;
  duration?: number;
  distance?: number;
};

// Progress tracking
export const ProgressSchema = z.object({
  id: z.number().optional(),
  workout_id: z.number(),
  set_number: z.number().int().positive(),
  completed_reps: z.number().int().nonnegative().optional(),
  completed_weight: z.number().nonnegative().optional(),
  completed_duration: z.number().nonnegative().optional(),
  completed_at: z.date(),
  notes: z.string().optional(),
});

export type Progress = z.infer<typeof ProgressSchema>;

// Block
export const BlockSchema = z.object({
  id: z.number().optional(),
  block_id: z.string().min(1),
  block_name: z.string().min(1),
  is_active: z.number(),
  created_at: z.date(),
});

export type Block = z.infer<typeof BlockSchema>;

// Set progress (used in UI state, not persisted directly)
export interface SetProgress {
  set_number: number;
  completed_reps?: number;
  completed_weight?: number;
  completed_duration?: number;
  notes?: string;
}

export interface PendingImport {
  workoutData: Array<WorkoutRow>;
  blockIds: Set<string>;
}

export const EXPORT_HEADERS = [
  'block_id',
  'day',
  'exercise_name',
  'category',
  'type',
  'sets',
  'reps',
  'weight',
  'duration',
  'distance',
  'rest',
  'cues',
  'guidance',
  'resistance',
  'description',
  'set_number',
  'completed_reps',
  'completed_weight',
  'completed_duration',
  'completed_at',
  'notes',
] as const;

export const AI_COPY_TEMPLATE = `Generate a workout in TSV (Tab-Separated Values) format with these specifications:\n\nIMPORTANT: Use TAB characters (\\t) as delimiters, NOT commas. This allows text fields to contain commas and punctuation.\n\nUse this exact column order (15 columns). Every row must have all 15 columns — leave unused fields blank (empty between tabs):\nblock_id\\tday\\texercise_name\\tcategory\\ttype\\tsets\\treps\\tweight\\tduration\\tdistance\\trest\\tcues\\tguidance\\tresistance\\tdescription\n\nRequired fields: block_id, day, exercise_name, category, type, sets\nType-specific required fields:\n- weights: reps required, weight optional (omit for bodyweight)\n- time: duration required (in minutes)\n- mindset: duration optional (in minutes)\n- cardio: duration and/or distance (distance in metres)\n\nCategories: Intent (mental prep), Warm-up, Primary, Secondary, Additional, Cool-down\nTypes: weights, time, mindset, cardio\n\nStart each workout with an Intent exercise (category=Intent, type=mindset) for mental preparation.\n\nUse guidance for execution notes like "70% 1RM" or "per side".\nUse resistance for non-weight exercises like "Red band" or "Bodyweight".\nUse description for step-by-step exercise setup and execution instructions (recommended for weights and time exercises). Use numbered steps and \\n for line breaks. Example:\n"1. Stand with feet shoulder-width apart, toes slightly out.\\n2. Brace your core and keep your chest up.\\n3. Lower until thighs are parallel to the ground.\\n4. Drive through heels to return to standing."\n\nExample rows (all 15 columns, separated by TAB characters):\nblock_id\\tday\\texercise_name\\tcategory\\ttype\\tsets\\treps\\tweight\\tduration\\tdistance\\trest\\tcues\\tguidance\\tresistance\\tdescription\nWeek 1\\tDay 1\\tFocus\\tIntent\\tmindset\\t1\\t\\t\\t2\\t\\t0\\tToday's goal: build power, focus on explosive movement\\t\\t\\t\nWeek 1\\tDay 1\\tSquats\\tPrimary\\tweights\\t3\\t10\\t100\\t\\t\\t90\\tKeep chest up, drive through heels\\t70% 1RM\\t\\t1. Stand with feet shoulder-width apart, toes slightly out.\\n2. Brace your core and keep your chest up.\\n3. Lower by pushing hips back and bending knees until thighs are parallel to the ground.\\n4. Drive through heels to return to standing. Squeeze glutes at the top.\nWeek 1\\tDay 1\\tBand Pull\\tAdditional\\tweights\\t3\\t15\\t\\t\\t\\t60\\tControl the movement, squeeze at the top\\t\\tRed band\\t\nWeek 1\\tDay 1\\t5K Run\\tPrimary\\tcardio\\t1\\t\\t\\t30\\t5000\\t0\\tMaintain steady pace, breathe rhythmically\\t\\t\\t`;
