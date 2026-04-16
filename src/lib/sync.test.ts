import { describe, it, expect, vi, beforeEach } from 'vitest'
import { saveSnapshot, restoreSnapshot } from './sync'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock Supabase client
const mockUpsert = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()

vi.mock('./supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      upsert: mockUpsert,
      select: mockSelect,
    })),
  },
}))

// Mock Dexie database
const mockBlocks = [{ id: 1, block_id: 'B1', block_name: 'Block 1', is_active: 1, created_at: new Date() }]
const mockWorkouts = [{ id: 1, block_id: 'B1', day: 'Day 1', exercise_name: 'Squat', category: 'Primary', type: 'weights', sets: 3, rest: 60, description: 'Squat down' }]
const mockProgress = [{ id: 1, workout_id: 1, set_number: 1, completed_reps: 10, completed_at: new Date() }]

vi.mock('./database', () => ({
  db: {
    blocks: {
      toArray: vi.fn(async () => mockBlocks),
      bulkPut: vi.fn(async () => {}),
    },
    workouts: {
      toArray: vi.fn(async () => mockWorkouts),
      bulkPut: vi.fn(async () => {}),
    },
    progress: {
      toArray: vi.fn(async () => mockProgress),
      bulkPut: vi.fn(async () => {}),
    },
  },
}))

// ---------------------------------------------------------------------------
// saveSnapshot
// ---------------------------------------------------------------------------
describe('saveSnapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpsert.mockResolvedValue({ error: null })
  })

  it('reads all three tables from IndexedDB', async () => {
    const { db } = await import('./database')
    await saveSnapshot('user-123')
    expect(db.blocks.toArray).toHaveBeenCalled()
    expect(db.workouts.toArray).toHaveBeenCalled()
    expect(db.progress.toArray).toHaveBeenCalled()
  })

  it('upserts to the snapshots table with user_id and data', async () => {
    await saveSnapshot('user-123')
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-123',
        data: expect.objectContaining({
          blocks: mockBlocks,
          workouts: mockWorkouts,
          progress: mockProgress,
        }),
      })
    )
  })

  it('includes a savedAt timestamp in the snapshot data', async () => {
    await saveSnapshot('user-123')
    const [call] = mockUpsert.mock.calls
    expect(call[0].data.savedAt).toBeDefined()
    expect(typeof call[0].data.savedAt).toBe('string')
  })

  it('logs an error to console when upsert fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockUpsert.mockResolvedValue({ error: { message: 'DB error' } })
    await saveSnapshot('user-123')
    expect(consoleSpy).toHaveBeenCalledWith('Snapshot save failed:', expect.objectContaining({ message: 'DB error' }))
    consoleSpy.mockRestore()
  })

  it('does not throw when upsert fails', async () => {
    mockUpsert.mockResolvedValue({ error: { message: 'DB error' } })
    await expect(saveSnapshot('user-123')).resolves.toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// restoreSnapshot
// ---------------------------------------------------------------------------
describe('restoreSnapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSingle.mockResolvedValue({
      data: { data: { blocks: mockBlocks, workouts: mockWorkouts, progress: mockProgress } },
      error: null,
    })
    mockEq.mockReturnValue({ single: mockSingle })
    mockSelect.mockReturnValue({ eq: mockEq })
  })

  it('queries the snapshots table for the given user_id', async () => {
    const { supabase } = await import('./supabase')
    await restoreSnapshot('user-456')
    expect(supabase.from).toHaveBeenCalledWith('snapshots')
    expect(mockSelect).toHaveBeenCalledWith('data')
    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-456')
  })

  it('bulk-puts all three tables into IndexedDB on success', async () => {
    const { db } = await import('./database')
    await restoreSnapshot('user-456')
    expect(db.blocks.bulkPut).toHaveBeenCalledWith(mockBlocks)
    expect(db.workouts.bulkPut).toHaveBeenCalledWith(mockWorkouts)
    expect(db.progress.bulkPut).toHaveBeenCalledWith(mockProgress)
  })

  it('returns true when a snapshot exists and is restored', async () => {
    const result = await restoreSnapshot('user-456')
    expect(result).toBe(true)
  })

  it('returns false when no snapshot exists (data is null)', async () => {
    mockSingle.mockResolvedValue({ data: null, error: null })
    const result = await restoreSnapshot('user-456')
    expect(result).toBe(false)
  })

  it('returns false when the query returns an error', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })
    const result = await restoreSnapshot('user-456')
    expect(result).toBe(false)
  })

  it('does not write to IndexedDB when no snapshot is found', async () => {
    const { db } = await import('./database')
    mockSingle.mockResolvedValue({ data: null, error: null })
    await restoreSnapshot('user-456')
    expect(db.blocks.bulkPut).not.toHaveBeenCalled()
    expect(db.workouts.bulkPut).not.toHaveBeenCalled()
    expect(db.progress.bulkPut).not.toHaveBeenCalled()
  })
})
