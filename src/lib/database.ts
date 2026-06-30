import type { StoredWorkout, WorkoutRow, Progress, Block } from './types';

export type Workout = StoredWorkout;
export type { Progress, Block };

// Module-level in-memory store. Populated from Supabase on login via initStore().
let _blocks: Block[] = [];
let _workouts: Workout[] = [];
let _progress: Progress[] = [];

let _nextWorkoutId = 1;
let _nextProgressId = 1;
let _nextBlockId = 1;

export function initStore(data: { blocks: Block[]; workouts: Workout[]; progress: Progress[] }) {
  _blocks = data.blocks ?? [];
  _workouts = data.workouts ?? [];
  _progress = data.progress ?? [];

  const maxWorkoutId = _workouts.reduce((m, w) => Math.max(m, w.id ?? 0), 0);
  const maxProgressId = _progress.reduce((m, p) => Math.max(m, p.id ?? 0), 0);
  const maxBlockId = _blocks.reduce((m, b) => Math.max(m, b.id ?? 0), 0);
  _nextWorkoutId = maxWorkoutId + 1;
  _nextProgressId = maxProgressId + 1;
  _nextBlockId = maxBlockId + 1;
}

export function getSnapshot() {
  return { blocks: _blocks, workouts: _workouts, progress: _progress };
}

export const dbHelpers = {
  // Block operations
  async createBlock(blockData: Omit<Block, 'id'>): Promise<number> {
    const id = _nextBlockId++;
    _blocks.push({ ...blockData, id });
    return id;
  },

  async getActiveBlock(): Promise<Block | undefined> {
    return _blocks.find(b => b.is_active === 1);
  },

  async getAllBlocks(): Promise<Block[]> {
    return [..._blocks].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  async setActiveBlock(blockId: string): Promise<void> {
    _blocks = _blocks.map(b => ({ ...b, is_active: b.block_id === blockId ? 1 : 0 }));
  },

  // Workout operations
  async importWorkouts(workouts: WorkoutRow[]): Promise<number> {
    for (const w of workouts) {
      const id = _nextWorkoutId++;
      _workouts.push({ ...w, id } as Workout);
    }
    return workouts.length;
  },

  async getWorkoutsByBlock(blockId: string): Promise<Workout[]> {
    return _workouts.filter(w => w.block_id === blockId);
  },

  async getWorkoutsByBlockAndDay(blockId: string, day: string): Promise<Workout[]> {
    return _workouts.filter(w => w.block_id === blockId && w.day === day);
  },

  async deleteWorkoutsByBlock(blockId: string): Promise<number> {
    const before = _workouts.length;
    _workouts = _workouts.filter(w => w.block_id !== blockId);
    return before - _workouts.length;
  },

  async addWorkout(workout: Omit<Workout, 'id'>): Promise<number> {
    const id = _nextWorkoutId++;
    _workouts.push({ ...workout, id } as Workout);
    return id;
  },

  async updateWorkoutById(id: number, patch: Partial<Workout>): Promise<void> {
    _workouts = _workouts.map(w => (w.id === id ? { ...w, ...patch } : w));
  },

  async deleteWorkoutById(id: number): Promise<void> {
    _workouts = _workouts.filter(w => w.id !== id);
  },

  async findWorkout(match: {
    block_id: string;
    day: string;
    exercise_name: string;
  }): Promise<Workout | undefined> {
    return _workouts.find(
      w =>
        w.block_id === match.block_id &&
        w.day === match.day &&
        w.exercise_name === match.exercise_name
    );
  },

  // Progress operations
  async saveProgress(progressData: Omit<Progress, 'id' | 'completed_at'>): Promise<number> {
    const id = _nextProgressId++;
    _progress.push({ ...progressData, id, completed_at: new Date() });
    return id;
  },

  async getProgressByWorkout(workoutId: number): Promise<Progress[]> {
    return _progress.filter(p => p.workout_id === workoutId);
  },

  async getProgressByBlock(blockId: string): Promise<Progress[]> {
    const workoutIds = new Set(_workouts.filter(w => w.block_id === blockId).map(w => w.id!));
    return _progress.filter(p => workoutIds.has(p.workout_id));
  },

  async getProgressWithWorkoutDetails(): Promise<Array<Progress & { workout?: Workout }>> {
    const workoutById = new Map(_workouts.map(w => [w.id!, w]));
    return [..._progress]
      .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())
      .map(p => ({ ...p, workout: workoutById.get(p.workout_id) }));
  },

  async exportBlockData(blockId: string): Promise<{ workouts: Workout[]; progress: Progress[] }> {
    const workouts = await this.getWorkoutsByBlock(blockId);
    const progress = await this.getProgressByBlock(blockId);
    return { workouts, progress };
  },

  async clearAllData(): Promise<void> {
    _blocks = [];
    _workouts = [];
    _progress = [];
    _nextWorkoutId = 1;
    _nextProgressId = 1;
    _nextBlockId = 1;
  },
};
