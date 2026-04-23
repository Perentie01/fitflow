import { Loader2 } from 'lucide-react';
import type { ProposedChanges, TargetedOperation } from '../../lib/types';

interface Props {
  changes: ProposedChanges;
  onApply: () => void;
  onDiscard: () => void;
  isApplying: boolean;
}

const formatWorkoutSummary = (w: {
  type: string;
  sets?: number;
  reps?: number;
  duration?: number;
  distance?: number;
  weight?: number;
}): string => {
  const parts: string[] = [];
  if (w.sets !== undefined) parts.push(`${w.sets}×`);
  if (w.reps !== undefined) parts.push(`${w.reps} reps`);
  if (w.duration !== undefined) parts.push(`${w.duration} min`);
  if (w.distance !== undefined) parts.push(`${w.distance}m`);
  if (w.weight !== undefined) parts.push(`${w.weight} kg`);
  return parts.join(' ');
};

const formatPatch = (patch: Record<string, unknown>): string =>
  Object.entries(patch)
    .filter(([k]) => k !== 'block_id' && k !== 'day' && k !== 'exercise_name')
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');

const OpBadge = ({ op }: { op: 'add' | 'modify' | 'delete' }) => {
  const styles = {
    add: 'text-[var(--success)] border-[var(--success)]',
    modify: 'text-[var(--accent-text)] border-[var(--accent)]',
    delete: 'text-[var(--error)] border-[var(--error)]',
  };
  const labels = { add: 'Add', modify: 'Modify', delete: 'Delete' };
  return (
    <span
      className={`inline-block text-[11px] font-medium border rounded px-1.5 py-0.5 leading-none font-[Geist] ${styles[op]}`}
    >
      {labels[op]}
    </span>
  );
};

const TargetedView = ({ operations }: { operations: TargetedOperation[] }) => {
  const byDay = operations.reduce<Record<string, TargetedOperation[]>>((acc, op) => {
    const day = op.op === 'add' ? op.workout.day : op.match.day;
    if (!acc[day]) acc[day] = [];
    acc[day].push(op);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(byDay).map(([day, ops]) => (
        <div key={day}>
          <div className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)] mb-2 font-[Geist]">
            {day}
          </div>
          <div className="space-y-2">
            {ops.map((op, i) => {
              if (op.op === 'add') {
                return (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-lg px-3 py-2.5"
                    style={{ background: 'var(--bg-raised)' }}
                  >
                    <OpBadge op="add" />
                    <div className="flex-1 min-w-0">
                      <span className="text-[14px] font-medium text-[var(--text)] font-[Geist]">
                        {op.workout.exercise_name}
                      </span>
                      <span className="ml-2 text-[12px] text-[var(--text-muted)] font-[Geist_Mono] tabular-nums">
                        {formatWorkoutSummary(op.workout)}
                      </span>
                    </div>
                  </div>
                );
              }
              if (op.op === 'modify') {
                return (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-lg px-3 py-2.5"
                    style={{ background: 'var(--bg-raised)' }}
                  >
                    <OpBadge op="modify" />
                    <div className="flex-1 min-w-0">
                      <span className="text-[14px] font-medium text-[var(--text)] font-[Geist]">
                        {op.match.exercise_name}
                      </span>
                      <span className="ml-2 text-[12px] text-[var(--text-muted)] font-[Geist]">
                        {formatPatch(op.patch as Record<string, unknown>)}
                      </span>
                    </div>
                  </div>
                );
              }
              return (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-lg px-3 py-2.5"
                  style={{ background: 'var(--bg-raised)' }}
                >
                  <OpBadge op="delete" />
                  <div className="flex-1 min-w-0">
                    <span className="text-[14px] font-medium text-[var(--text)] line-through opacity-60 font-[Geist]">
                      {op.match.exercise_name}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

type FullWorkout = {
  day: string;
  exercise_name: string;
  type: string;
  sets?: number;
  reps?: number;
  duration?: number;
  distance?: number;
  weight?: number;
  category: string;
};

const FullView = ({ blockId, workouts }: { blockId: string; workouts: FullWorkout[] }) => {
  const byDay = workouts.reduce<Record<string, FullWorkout[]>>((acc, w) => {
    if (!acc[w.day]) acc[w.day] = [];
    acc[w.day].push(w);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div
        className="text-[13px] font-medium text-[var(--accent-text)] px-3 py-2 rounded-lg font-[Geist]"
        style={{ background: 'var(--accent-dim)' }}
      >
        Full program replacement for{' '}
        <span className="font-[Geist_Mono]">{blockId}</span>
      </div>
      {Object.entries(byDay).map(([day, ws]) => (
        <div key={day}>
          <div className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)] mb-2 font-[Geist]">
            {day}
          </div>
          <div
            className="rounded-lg overflow-hidden"
            style={{ border: '1px solid var(--border)' }}
          >
            <table className="w-full text-[12px]">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-raised)' }}>
                  <th className="text-left px-3 py-2 text-[var(--text-muted)] font-medium font-[Geist]">
                    Exercise
                  </th>
                  <th className="text-left px-3 py-2 text-[var(--text-muted)] font-medium font-[Geist]">
                    Category
                  </th>
                  <th className="text-right px-3 py-2 text-[var(--text-muted)] font-medium font-[Geist_Mono]">
                    Volume
                  </th>
                </tr>
              </thead>
              <tbody>
                {ws.map((w, i) => (
                  <tr
                    key={i}
                    style={{
                      borderBottom: i < ws.length - 1 ? '1px solid var(--border-subtle)' : undefined,
                    }}
                  >
                    <td className="px-3 py-2 text-[var(--text)] font-[Geist]">
                      {w.exercise_name}
                    </td>
                    <td className="px-3 py-2 text-[var(--text-muted)] font-[Geist]">
                      {w.category}
                    </td>
                    <td className="px-3 py-2 text-right text-[var(--text-muted)] font-[Geist_Mono] tabular-nums">
                      {formatWorkoutSummary(w)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
};

export const ProgramChangesPreview = ({ changes, onApply, onDiscard, isApplying }: Props) => (
  <div
    className="rounded-xl overflow-hidden"
    style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}
  >
    <div
      className="px-4 py-3 text-[13px] font-medium text-[var(--text-muted)] font-[Geist]"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      Proposed changes
    </div>

    <div className="px-4 py-4 max-h-72 overflow-y-auto">
      {changes.type === 'targeted' ? (
        <TargetedView operations={changes.operations} />
      ) : (
        <FullView blockId={changes.block_id} workouts={changes.workouts} />
      )}
    </div>

    <div
      className="flex gap-2 px-4 py-3"
      style={{ borderTop: '1px solid var(--border)' }}
    >
      <button
        onClick={onApply}
        disabled={isApplying}
        className="flex items-center gap-1.5 px-4 py-2 rounded-md text-[13px] font-medium font-[Geist] disabled:opacity-50"
        style={{ background: 'var(--accent)', color: '#111110' }}
      >
        {isApplying && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Apply
      </button>
      <button
        onClick={onDiscard}
        disabled={isApplying}
        className="px-4 py-2 rounded-md text-[13px] font-medium font-[Geist] text-[var(--text-muted)] disabled:opacity-50"
        style={{ background: 'var(--bg-raised)' }}
      >
        Discard
      </button>
    </div>
  </div>
);
