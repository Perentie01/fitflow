import { supabase } from './supabase';
import { initStore, getSnapshot } from './database';
import type { Block, StoredWorkout, Progress } from './types';
import type { Json } from './database.types';

// Shape stored inside the snapshots.data jsonb column.
interface SnapshotData {
  blocks?: Block[];
  workouts?: StoredWorkout[];
  progress?: Progress[];
}

export interface SnapshotMeta {
  saved_at: string;
}

const hashData = async (data: unknown): Promise<string> => {
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  const buf = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

export async function saveSnapshot(userId: string, label?: string): Promise<void> {
  const data = getSnapshot();
  const hash = await hashData(data);

  const { data: existing } = await supabase
    .from('snapshots')
    .select('data_hash')
    .eq('user_id', userId)
    .single();

  if (existing?.data_hash === hash) return;

  const row: Record<string, unknown> = {
    user_id: userId,
    data: data as unknown as Json,
    data_hash: hash,
    saved_at: new Date().toISOString(),
  };
  if (label !== undefined) row.label = label;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase.from('snapshots').upsert(row as any);
  if (error) throw new Error(`Snapshot save failed: ${error.message}`);
}

export async function restoreSnapshot(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('snapshots')
    .select('data')
    .eq('user_id', userId)
    .order('saved_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return false;

  const snapshot = data.data as unknown as SnapshotData;
  initStore({
    blocks: snapshot.blocks ?? [],
    workouts: snapshot.workouts ?? [],
    progress: snapshot.progress ?? [],
  });
  return true;
}

export async function listSnapshots(userId: string): Promise<SnapshotMeta[]> {
  const { data, error } = await supabase
    .from('snapshots')
    .select('saved_at')
    .eq('user_id', userId)
    .order('saved_at', { ascending: false });

  if (error || !data) return [];
  return data;
}
