import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyProposedChanges } from './coachingApply';
import type { ProposedChanges, StoredWorkout } from './types';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const SQUAT: StoredWorkout & { id: number } = {
  id: 42,
  block_id: 'Block 1',
  day: 'Day 1',
  exercise_name: 'Squat',
  category: 'Primary',
  type: 'weights',
  sets: 3,
  reps: 5,
  weight: 100,
  rest: 90,
  cues: '',
};

const mockFirst = vi.fn();
const mockWhere = vi.fn<(criteria: Record<string, unknown>) => { first: typeof mockFirst }>(
  () => ({ first: mockFirst }),
);

vi.mock('./database', () => ({
  db: {
    workouts: {
      where: (criteria: Record<string, unknown>) => mockWhere(criteria),
    },
  },
  dbHelpers: {
    addWorkout: vi.fn(async () => 1),
    updateWorkoutById: vi.fn(async () => {}),
    deleteWorkoutById: vi.fn(async () => {}),
    deleteWorkoutsByBlock: vi.fn(async () => 0),
    importWorkouts: vi.fn(async () => 0),
  },
}));

describe('applyProposedChanges — targeted', () => {
  let reloadBlocks: ReturnType<typeof vi.fn<() => Promise<void>>>;
  let saveSnapshot: ReturnType<typeof vi.fn<(userId: string) => Promise<void>>>;

  beforeEach(() => {
    vi.clearAllMocks();
    reloadBlocks = vi.fn<() => Promise<void>>(async () => {});
    saveSnapshot = vi.fn<(userId: string) => Promise<void>>(async () => {});
  });

  it('adds a workout via dbHelpers.addWorkout', async () => {
    const { dbHelpers } = await import('./database');
    const newWorkout: StoredWorkout = {
      block_id: 'Block 1',
      day: 'Day 1',
      exercise_name: 'Bench Press',
      category: 'Primary',
      type: 'weights',
      sets: 3,
      reps: 8,
      rest: 90,
      cues: '',
    };
    const changes: ProposedChanges = {
      type: 'targeted',
      operations: [{ op: 'add', workout: newWorkout }],
    };

    await applyProposedChanges(changes, 'Block 1', reloadBlocks, saveSnapshot, 'user-1');

    expect(dbHelpers.addWorkout).toHaveBeenCalledTimes(1);
    expect(dbHelpers.addWorkout).toHaveBeenCalledWith(newWorkout);
  });

  it('modifies a workout by resolving match to id then calling updateWorkoutById', async () => {
    const { dbHelpers } = await import('./database');
    mockFirst.mockResolvedValueOnce(SQUAT);

    const changes: ProposedChanges = {
      type: 'targeted',
      operations: [
        {
          op: 'modify',
          match: { block_id: 'Block 1', day: 'Day 1', exercise_name: 'Squat' },
          patch: { weight: 120 },
        },
      ],
    };

    await applyProposedChanges(changes, 'Block 1', reloadBlocks, saveSnapshot, 'user-1');

    expect(mockWhere).toHaveBeenCalledWith({
      block_id: 'Block 1',
      day: 'Day 1',
      exercise_name: 'Squat',
    });
    expect(dbHelpers.updateWorkoutById).toHaveBeenCalledTimes(1);
    expect(dbHelpers.updateWorkoutById).toHaveBeenCalledWith(42, { weight: 120 });
  });

  it('skips modify when no matching workout is found', async () => {
    const { dbHelpers } = await import('./database');
    mockFirst.mockResolvedValueOnce(undefined);

    const changes: ProposedChanges = {
      type: 'targeted',
      operations: [
        {
          op: 'modify',
          match: { block_id: 'Block 1', day: 'Day 1', exercise_name: 'Ghost' },
          patch: { weight: 120 },
        },
      ],
    };

    await applyProposedChanges(changes, 'Block 1', reloadBlocks, saveSnapshot, 'user-1');

    expect(dbHelpers.updateWorkoutById).not.toHaveBeenCalled();
  });

  it('deletes a workout by resolving match to id then calling deleteWorkoutById', async () => {
    const { dbHelpers } = await import('./database');
    mockFirst.mockResolvedValueOnce(SQUAT);

    const changes: ProposedChanges = {
      type: 'targeted',
      operations: [
        {
          op: 'delete',
          match: { block_id: 'Block 1', day: 'Day 1', exercise_name: 'Squat' },
        },
      ],
    };

    await applyProposedChanges(changes, 'Block 1', reloadBlocks, saveSnapshot, 'user-1');

    expect(dbHelpers.deleteWorkoutById).toHaveBeenCalledTimes(1);
    expect(dbHelpers.deleteWorkoutById).toHaveBeenCalledWith(42);
  });

  it('applies multiple mixed operations in order', async () => {
    const { dbHelpers } = await import('./database');
    mockFirst
      .mockResolvedValueOnce(SQUAT) // for modify
      .mockResolvedValueOnce(SQUAT); // for delete

    const newWorkout: StoredWorkout = {
      block_id: 'Block 1',
      day: 'Day 2',
      exercise_name: 'Row',
      category: 'Primary',
      type: 'weights',
      sets: 3,
      reps: 10,
      rest: 60,
      cues: '',
    };
    const changes: ProposedChanges = {
      type: 'targeted',
      operations: [
        { op: 'add', workout: newWorkout },
        {
          op: 'modify',
          match: { block_id: 'Block 1', day: 'Day 1', exercise_name: 'Squat' },
          patch: { reps: 6 },
        },
        {
          op: 'delete',
          match: { block_id: 'Block 1', day: 'Day 1', exercise_name: 'Squat' },
        },
      ],
    };

    await applyProposedChanges(changes, 'Block 1', reloadBlocks, saveSnapshot, 'user-1');

    expect(dbHelpers.addWorkout).toHaveBeenCalledTimes(1);
    expect(dbHelpers.updateWorkoutById).toHaveBeenCalledTimes(1);
    expect(dbHelpers.deleteWorkoutById).toHaveBeenCalledTimes(1);
  });
});

describe('applyProposedChanges — full replacement', () => {
  let reloadBlocks: ReturnType<typeof vi.fn<() => Promise<void>>>;
  let saveSnapshot: ReturnType<typeof vi.fn<(userId: string) => Promise<void>>>;

  beforeEach(() => {
    vi.clearAllMocks();
    reloadBlocks = vi.fn<() => Promise<void>>(async () => {});
    saveSnapshot = vi.fn<(userId: string) => Promise<void>>(async () => {});
  });

  it('deletes existing workouts in block then imports new ones', async () => {
    const { dbHelpers } = await import('./database');
    const workouts: StoredWorkout[] = [
      {
        block_id: 'Block 2',
        day: 'Day 1',
        exercise_name: 'Deadlift',
        category: 'Primary',
        type: 'weights',
        sets: 3,
        reps: 5,
        rest: 120,
        cues: '',
      },
    ];
    const changes: ProposedChanges = {
      type: 'full',
      block_id: 'Block 2',
      workouts,
    };

    await applyProposedChanges(changes, 'Block 2', reloadBlocks, saveSnapshot, 'user-1');

    expect(dbHelpers.deleteWorkoutsByBlock).toHaveBeenCalledWith('Block 2');
    expect(dbHelpers.importWorkouts).toHaveBeenCalledWith(workouts);

    const deleteOrder = (dbHelpers.deleteWorkoutsByBlock as ReturnType<typeof vi.fn>).mock
      .invocationCallOrder[0];
    const importOrder = (dbHelpers.importWorkouts as ReturnType<typeof vi.fn>).mock
      .invocationCallOrder[0];
    expect(deleteOrder).toBeLessThan(importOrder);
  });
});

describe('applyProposedChanges — side effects', () => {
  let reloadBlocks: ReturnType<typeof vi.fn<() => Promise<void>>>;
  let saveSnapshot: ReturnType<typeof vi.fn<(userId: string) => Promise<void>>>;

  beforeEach(() => {
    vi.clearAllMocks();
    reloadBlocks = vi.fn<() => Promise<void>>(async () => {});
    saveSnapshot = vi.fn<(userId: string) => Promise<void>>(async () => {});
  });

  it('calls reloadBlocks and saveSnapshot once after a targeted apply', async () => {
    mockFirst.mockResolvedValueOnce(SQUAT);

    const changes: ProposedChanges = {
      type: 'targeted',
      operations: [
        {
          op: 'delete',
          match: { block_id: 'Block 1', day: 'Day 1', exercise_name: 'Squat' },
        },
      ],
    };

    await applyProposedChanges(changes, 'Block 1', reloadBlocks, saveSnapshot, 'user-abc');

    expect(reloadBlocks).toHaveBeenCalledTimes(1);
    expect(saveSnapshot).toHaveBeenCalledTimes(1);
    expect(saveSnapshot).toHaveBeenCalledWith('user-abc');
  });

  it('calls reloadBlocks and saveSnapshot once after a full apply', async () => {
    const changes: ProposedChanges = {
      type: 'full',
      block_id: 'Block 1',
      workouts: [
        {
          block_id: 'Block 1',
          day: 'Day 1',
          exercise_name: 'Squat',
          category: 'Primary',
          type: 'weights',
          sets: 3,
          reps: 5,
          rest: 90,
          cues: '',
        },
      ],
    };

    await applyProposedChanges(changes, 'Block 1', reloadBlocks, saveSnapshot, 'user-abc');

    expect(reloadBlocks).toHaveBeenCalledTimes(1);
    expect(saveSnapshot).toHaveBeenCalledTimes(1);
    expect(saveSnapshot).toHaveBeenCalledWith('user-abc');
  });

  it('calls reloadBlocks before saveSnapshot', async () => {
    const changes: ProposedChanges = {
      type: 'full',
      block_id: 'Block 1',
      workouts: [
        {
          block_id: 'Block 1',
          day: 'Day 1',
          exercise_name: 'Squat',
          category: 'Primary',
          type: 'weights',
          sets: 3,
          reps: 5,
          rest: 90,
          cues: '',
        },
      ],
    };

    await applyProposedChanges(changes, 'Block 1', reloadBlocks, saveSnapshot, 'user-abc');

    const reloadOrder = reloadBlocks.mock.invocationCallOrder[0];
    const saveOrder = saveSnapshot.mock.invocationCallOrder[0];
    expect(reloadOrder).toBeLessThan(saveOrder);
  });
});
