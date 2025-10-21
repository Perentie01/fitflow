import Dexie from 'dexie';

export interface Workout {
  id?: number;
  week_id: string;
  day: string;
  exercise_name: string;
  category: 'Warm-up' | 'Primary' | 'Secondary' | 'Additional' | 'Cool-down';
  type: 'weights' | 'time';
  sets: number;
  reps?: number;
  weight?: number;
  duration?: number;
  rest: number;
  cues: string;
}

export interface Progress {
  id?: number;
  workout_id: number;
  set_number: number;
  completed_reps?: number;
  completed_weight?: number;
  completed_duration?: number;
  completed_at: Date;
  notes?: string;
}

export interface Week {
  id?: number;
  week_id: string;
  week_number: number;
  year: number;
  start_date: Date;
  end_date: Date;
  is_active: number;
}

// Define the database schema
export class FitFlowDatabase extends Dexie {
  workouts!: Dexie.Table<Workout, number>;
  progress!: Dexie.Table<Progress, number>;
  weeks!: Dexie.Table<Week, number>;

  constructor() {
    super('FitFlowDatabase');
    
    this.version(1).stores({
      workouts: '++id, week_id, day, exercise_name, category, type, sets, reps, weight, duration, rest, cues',
      progress: '++id, workout_id, set_number, completed_reps, completed_weight, completed_duration, completed_at, notes',
      weeks: '++id, week_id, week_number, year, start_date, end_date, is_active'
    });
  }
}

// Create database instance
export const db = new FitFlowDatabase();

// Helper functions for database operations
export const dbHelpers = {
  // Week operations
  async createWeek(weekData: Omit<Week, 'id'>): Promise<number> {
    return await db.weeks.add(weekData);
  },

  async getActiveWeek(): Promise<Week | undefined> {
    return await db.weeks.where('is_active').equals(1).first();
  },

  async getAllWeeks(): Promise<Week[]> {
    return await db.weeks.orderBy('year').reverse().toArray();
  },

  async setActiveWeek(weekId: string): Promise<void> {
    await db.weeks.where('is_active').equals(1).modify({ is_active: 0 });
    await db.weeks.where('week_id').equals(weekId).modify({ is_active: 1 });
  },

  // Workout operations
  async importWorkouts(workouts: Omit<Workout, 'id'>[]): Promise<string> {
    return await db.workouts.bulkAdd(workouts);
  },

  async getWorkoutsByWeek(weekId: string): Promise<Workout[]> {
    return await db.workouts.where('week_id').equals(weekId).toArray();
  },

  async getWorkoutsByWeekAndDay(weekId: string, day: string): Promise<Workout[]> {
    return await db.workouts.where({ week_id: weekId, day: day }).toArray();
  },

  async deleteWorkoutsByWeek(weekId: string): Promise<number> {
    return await db.workouts.where('week_id').equals(weekId).delete();
  },

  // Progress operations
  async saveProgress(progressData: Omit<Progress, 'id' | 'completed_at'>): Promise<number> {
    return await db.progress.add({
      ...progressData,
      completed_at: new Date()
    });
  },

  async getProgressByWorkout(workoutId: number): Promise<Progress[]> {
    return await db.progress.where('workout_id').equals(workoutId).toArray();
  },

  async getProgressByWeek(weekId: string): Promise<Progress[]> {
    const workouts = await this.getWorkoutsByWeek(weekId);
    const workoutIds = workouts.map(w => w.id!);
    return await db.progress.where('workout_id').anyOf(workoutIds).toArray();
  },

  // Export operations
  async exportWeekData(weekId: string): Promise<{ workouts: Workout[], progress: Progress[] }> {
    const workouts = await this.getWorkoutsByWeek(weekId);
    const progress = await this.getProgressByWeek(weekId);
    return { workouts, progress };
  },

  // Utility functions
  async clearAllData(): Promise<void> {
    await db.workouts.clear();
    await db.progress.clear();
    await db.weeks.clear();
  },

  // Generate week ID based on year and week number
  generateWeekId(year: number, weekNumber: number): string {
    return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
  },

  // Get current week information
  getCurrentWeekInfo() {
    const now = new Date();
    const year = now.getFullYear();
    
    // Calculate week number (ISO week)
    const startOfYear = new Date(year, 0, 1);
    const pastDaysOfYear = (now.getTime() - startOfYear.getTime()) / 86400000;
    const weekNumber = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
    
    // Calculate start and end dates of the week
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    return {
      year,
      weekNumber,
      weekId: this.generateWeekId(year, weekNumber),
      startDate: startOfWeek,
      endDate: endOfWeek
    };
  }
};

// Initialize current week if it doesn't exist
export async function initializeCurrentWeek(): Promise<{ year: number, weekNumber: number, weekId: string, startDate: Date, endDate: Date }> {
  const currentWeekInfo = dbHelpers.getCurrentWeekInfo();
  const existingWeek = await db.weeks.where('week_id').equals(currentWeekInfo.weekId).first();
  
  if (!existingWeek) {
    await dbHelpers.createWeek({
      week_id: currentWeekInfo.weekId,
      week_number: currentWeekInfo.weekNumber,
      year: currentWeekInfo.year,
      start_date: currentWeekInfo.startDate,
      end_date: currentWeekInfo.endDate,
      is_active: 1
    });
  }
  
  return currentWeekInfo;
}

