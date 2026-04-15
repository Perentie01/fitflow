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

export type Category = (typeof CATEGORIES)[number];

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

export const AI_COPY_TEMPLATE = `Generate a workout in TSV (Tab-Separated Values) format with these specifications:\n\nIMPORTANT: Use TAB characters (\\t) as delimiters, NOT commas. This allows text fields to contain commas and punctuation.\n\nRequired columns: block_id, day, exercise_name, category, type, sets, rest, cues\nOptional columns: reps, weight, duration, guidance, resistance, description\n\nCategories: Intent (mental prep), Warm-up, Primary, Secondary, Additional, Cool-down\nTypes: weights, time, mindset\n\nStart each workout with an Intent exercise (category=Intent, type=mindset) for mental preparation.\n\nUse guidance for instructions like "70% 1RM" or "per side".\nUse resistance for non-weight exercises like "Red band" or "Bodyweight".\nUse description for detailed exercise setup and execution (e.g., "Stand with feet shoulder-width apart, toes slightly out. Lower until thighs parallel to ground, keeping chest up. Drive through heels to return to standing.").\n\nExample format (columns separated by TAB characters):\nblock_id\\tday\\texercise_name\\tcategory\\ttype\\tsets\\treps\\tweight\\tduration\\trest\\tcues\\tguidance\\tresistance\\tdescription\nWeek 1\\tDay 1\\tFocus\\tIntent\\tmindset\\t1\\t\\t\\t2\\t0\\tToday's goal: build power, focus on explosive movement\\t\\t\\t\nWeek 1\\tDay 1\\tSquats\\tPrimary\\tweights\\t3\\t10\\t100\\t\\t90\\tKeep chest up, drive through heels\\t70% 1RM\\t\\tStand with feet shoulder-width apart, toes slightly out. Lower until thighs parallel to ground, keeping chest up. Drive through heels to return to standing.\nWeek 1\\tDay 1\\tBand Pull\\tAdditional\\tweights\\t3\\t15\\t\\t\\t60\\tControl the movement, squeeze at the top\\t\\tRed band\\t`;

// Shared interfaces
export interface SetProgress {
  set_number: number;
  completed_reps?: number;
  completed_weight?: number;
  completed_duration?: number;
  notes?: string;
}

export interface PendingImport {
  workoutData: Array<Record<string, unknown>>;
  blockIds: Set<string>;
}
