import { supabase } from './supabase'
import { db } from './database'

export async function saveSnapshot(userId: string): Promise<void> {
  const snapshot = {
    blocks: await db.blocks.toArray(),
    workouts: await db.workouts.toArray(),
    progress: await db.progress.toArray(),
    savedAt: new Date().toISOString()
  }

  const { error } = await supabase
    .from('snapshots')
    .upsert({ user_id: userId, data: snapshot, saved_at: new Date().toISOString() })

  if (error) console.error('Snapshot save failed:', error)
}

export async function restoreSnapshot(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('snapshots')
    .select('data')
    .eq('user_id', userId)
    .single()

  if (error || !data) return false

  await db.blocks.bulkPut(data.data.blocks)
  await db.workouts.bulkPut(data.data.workouts)
  await db.progress.bulkPut(data.data.progress)

  return true
}
