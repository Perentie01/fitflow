import Dexie from 'dexie';
import type { StoredWorkout, WorkoutRow, Progress, Block } from './types';

// Dexie returns plain objects so we use the flattened StoredWorkout type.
// Use WorkoutSchema for strict discriminated-union validation at import time.
export type Workout = StoredWorkout;
export type { Progress, Block };

// Define the database schema
export class FitFlowDatabase extends Dexie {
  workouts!: Dexie.Table<Workout, number>;
  progress!: Dexie.Table<Progress, number>;
  blocks!: Dexie.Table<Block, number>;

  constructor() {
    super('FitFlowDatabase');

    // Version 4: Drop the legacy seeded "Block 1" row so it can't overwrite real
    // data during a cross-device restore. Only removes the seed when no workouts
    // reference it, so users who genuinely named their block "Block 1" are preserved.
    this.version(4).stores({
      workouts: '++id, block_id, day, exercise_name, category, type, sets, reps, weight, duration, rest, cues, guidance, resistance, description',
      progress: '++id, workout_id, set_number, completed_reps, completed_weight, completed_duration, completed_at, notes',
      blocks: '++id, block_id, block_name, is_active, created_at'
    }).upgrade(async tx => {
      const workoutCount = await tx.table('workouts')
        .where('block_id').equals('Block 1').count();
      if (workoutCount === 0) {
        await tx.table('blocks')
          .where({ block_id: 'Block 1', block_name: 'Block 1' })
          .delete();
      }
    });

    // Version 3: Add guidance, resistance, description (exercise setup/execution instructions) fields
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
  async importWorkouts(workouts: WorkoutRow[]): Promise<number> {
    return await db.workouts.bulkAdd(workouts as Omit<Workout, 'id'>[]);
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

  async getProgressWithWorkoutDetails(): Promise<Array<Progress & { workout?: Workout }>> {
    const allProgress = await db.progress.toArray();
    const progressWithDetails = await Promise.all(
      allProgress.map(async (progress) => {
        const workout = await db.workouts.get(progress.workout_id);
        return { ...progress, workout };
      })
    );
    return progressWithDetails.sort((a, b) => 
      new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
    );
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

