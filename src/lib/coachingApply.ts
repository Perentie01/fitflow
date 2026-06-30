import { dbHelpers, type Workout } from './database';
import type { ProposedChanges } from './types';

export async function applyProposedChanges(
  changes: ProposedChanges,
  activeBlockId: string,
  reloadBlocks: () => Promise<void>,
  saveSnapshot: (userId: string) => Promise<void>,
  userId: string,
): Promise<void> {
  if (changes.type === 'targeted') {
    for (const op of changes.operations) {
      if (op.op === 'add') {
        await dbHelpers.addWorkout(op.workout as Omit<Workout, 'id'>);
      } else if (op.op === 'modify') {
        const workout = await dbHelpers.findWorkout(op.match);
        if (workout?.id !== undefined) {
          await dbHelpers.updateWorkoutById(workout.id, op.patch as Partial<Workout>);
        }
      } else {
        const workout = await dbHelpers.findWorkout(op.match);
        if (workout?.id !== undefined) {
          await dbHelpers.deleteWorkoutById(workout.id);
        }
      }
    }
  } else {
    await dbHelpers.deleteWorkoutsByBlock(changes.block_id);
    await dbHelpers.importWorkouts(changes.workouts);
  }

  await reloadBlocks();
  await saveSnapshot(userId);
}
