import Dexie from 'dexie';

export interface Workout {
  id?: number;
  block_id: string;
  day: string;
  exercise_name: string;
  category: 'Warm-up' | 'Primary' | 'Secondary' | 'Additional' | 'Cool-down' | 'Intent';
  type: 'weights' | 'time' | 'mindset';
  sets: number;
  reps?: number;
  weight?: number;
  duration?: number;
  rest: number;
  cues: string;
  guidance?: string;      // Instructions like "70% 1RM", "per side", etc.
  resistance?: string;    // For non-weight exercises: "Red band", "Heavy", etc.
  description?: string;   // Detailed exercise description
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

export interface Block {
  id?: number;
  block_id: string;
  block_name: string;
  is_active: number;
  created_at: Date;
}

// Define the database schema
export class FitFlowDatabase extends Dexie {
  workouts!: Dexie.Table<Workout, number>;
  progress!: Dexie.Table<Progress, number>;
  blocks!: Dexie.Table<Block, number>;

  constructor() {
    super('FitFlowDatabase');
    
    // Version 3: Add guidance, resistance, description fields
    this.version(3).stores({
      workouts: '++id, block_id, day, exercise_name, category, type, sets, reps, weight, duration, rest, cues, guidance, resistance, description',
      progress: '++id, workout_id, set_number, completed_reps, completed_weight, completed_duration, completed_at, notes',
      blocks: '++id, block_id, block_name, is_active, created_at'
    });
    
    // Version 2: Migrated from weeks to blocks
    this.version(2).stores({
      workouts: '++id, block_id, day, exercise_name, category, type, sets, reps, weight, duration, rest, cues',
      progress: '++id, workout_id, set_number, completed_reps, completed_weight, completed_duration, completed_at, notes',
      blocks: '++id, block_id, block_name, is_active, created_at'
    }).upgrade(async tx => {
      // Migration: rename week_id to block_id in workouts
      const workouts = await tx.table('workouts').toArray();
      await tx.table('workouts').clear();
      
      const migratedWorkouts = workouts.map(w => ({
        ...w,
        block_id: (w as any).week_id || (w as any).block_id,
        week_id: undefined
      }));
      
      await tx.table('workouts').bulkAdd(migratedWorkouts);
      
      // Migration: convert weeks to blocks
      const weeks = await tx.table('weeks').toArray();
      await tx.table('blocks').clear();
      
      const migratedBlocks = weeks.map(w => ({
        block_id: (w as any).week_id,
        block_name: (w as any).week_id,
        is_active: (w as any).is_active,
        created_at: new Date()
      }));
      
      if (migratedBlocks.length > 0) {
        await tx.table('blocks').bulkAdd(migratedBlocks);
      }
    });
  }
}

// Create database instance
export const db = new FitFlowDatabase();

// Helper functions for database operations
export const dbHelpers = {
  // Block operations
  async createBlock(blockData: Omit<Block, 'id'>): Promise<number> {
    return await db.blocks.add(blockData);
  },

  async getActiveBlock(): Promise<Block | undefined> {
    return await db.blocks.where('is_active').equals(1).first();
  },

  async getAllBlocks(): Promise<Block[]> {
    return await db.blocks.orderBy('created_at').reverse().toArray();
  },

  async setActiveBlock(blockId: string): Promise<void> {
    await db.blocks.where('is_active').equals(1).modify({ is_active: 0 });
    await db.blocks.where('block_id').equals(blockId).modify({ is_active: 1 });
  },

  // Workout operations
  async importWorkouts(workouts: Omit<Workout, 'id'>[]): Promise<string> {
    return await db.workouts.bulkAdd(workouts);
  },

  async getWorkoutsByBlock(blockId: string): Promise<Workout[]> {
    return await db.workouts.where('block_id').equals(blockId).toArray();
  },

  async getWorkoutsByBlockAndDay(blockId: string, day: string): Promise<Workout[]> {
    return await db.workouts.where({ block_id: blockId, day: day }).toArray();
  },

  async deleteWorkoutsByBlock(blockId: string): Promise<number> {
    return await db.workouts.where('block_id').equals(blockId).delete();
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

  async getProgressByBlock(blockId: string): Promise<Progress[]> {
    const workouts = await this.getWorkoutsByBlock(blockId);
    const workoutIds = workouts.map(w => w.id!);
    return await db.progress.where('workout_id').anyOf(workoutIds).toArray();
  },

  // Export operations
  async exportBlockData(blockId: string): Promise<{ workouts: Workout[], progress: Progress[] }> {
    const workouts = await this.getWorkoutsByBlock(blockId);
    const progress = await this.getProgressByBlock(blockId);
    return { workouts, progress };
  },

  // Utility functions
  async clearAllData(): Promise<void> {
    await db.workouts.clear();
    await db.progress.clear();
    await db.blocks.clear();
  }
};

// Initialize with a default block if database is empty
export async function initializeDefaultBlock(): Promise<Block> {
  const existingBlocks = await db.blocks.toArray();
  
  if (existingBlocks.length === 0) {
    const defaultBlock: Omit<Block, 'id'> = {
      block_id: 'Block 1',
      block_name: 'Block 1',
      is_active: 1,
      created_at: new Date()
    };
    
    await dbHelpers.createBlock(defaultBlock);
    return { ...defaultBlock, id: 1 };
  }
  
  // Return active block or first block
  const activeBlock = await dbHelpers.getActiveBlock();
  if (activeBlock) return activeBlock;
  
  return existingBlocks[0];
}

