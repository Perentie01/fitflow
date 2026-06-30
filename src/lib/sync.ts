import { supabase } from './supabase';
import { initStore, getSnapshot } from './database';

export interface SnapshotMeta {
  id: string;
  saved_at: string;
  label: string | null;
}

export async function saveSnapshot(userId: string, label?: string): Promise<void> {
  const data = { ...getSnapshot(), savedAt: new Date().toISOString() };
  const row: Record<string, unknown> = { user_id: userId, data };
  if (label !== undefined) row.label = label;

  const { error } = await supabase.from('snapshots').insert(row);
  if (error) console.error('Snapshot save failed:', error);
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

  initStore({
    blocks: data.data.blocks ?? [],
    workouts: data.data.workouts ?? [],
    progress: data.data.progress ?? [],
  });
  return true;
}

export async function listSnapshots(userId: string): Promise<SnapshotMeta[]> {
  const { data, error } = await supabase
    .from('snapshots')
    .select('id, saved_at, label')
    .eq('user_id', userId)
    .order('saved_at', { ascending: false });

  if (error || !data) return [];
  return data as SnapshotMeta[];
}

export async function restoreSnapshotById(id: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('snapshots')
    .select('data')
    .eq('id', id)
    .single();

  if (error || !data) return false;

  initStore({
    blocks: data.data.blocks ?? [],
    workouts: data.data.workouts ?? [],
    progress: data.data.progress ?? [],
  });
  return true;
}
