import { db, dbHelpers, type Workout } from './database';
import type { ProposedChanges } from './types';

async function findWorkoutId(match: {
  block_id: string;
  day: string;
  exercise_name: string;
}): Promise<number | undefined> {
  const workout = await db.workouts
    .where({
      block_id: match.block_id,
      day: match.day,
      exercise_name: match.exercise_name,
    })
    .first();
  return workout?.id;
}

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
        const id = await findWorkoutId(op.match);
        if (id !== undefined) {
          await dbHelpers.updateWorkoutById(id, op.patch as Partial<Workout>);
        }
      } else {
        const id = await findWorkoutId(op.match);
        if (id !== undefined) {
          await dbHelpers.deleteWorkoutById(id);
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
