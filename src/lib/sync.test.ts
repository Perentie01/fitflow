import { describe, it, expect, vi, beforeEach } from 'vitest'
import { saveSnapshot, restoreSnapshot } from './sync'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockInsert = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockOrder = vi.fn()
const mockLimit = vi.fn()
const mockSingle = vi.fn()

vi.mock('./supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: mockInsert,
      select: mockSelect,
    })),
  },
}))

const mockInitStore = vi.fn()
const mockGetSnapshot = vi.fn()

const mockBlocks = [{ id: 1, block_id: 'B1', block_name: 'Block 1', is_active: 1, created_at: new Date() }]
const mockWorkouts = [{ id: 1, block_id: 'B1', day: 'Day 1', exercise_name: 'Squat', category: 'Primary', type: 'weights', sets: 3, rest: 60 }]
const mockProgress = [{ id: 1, workout_id: 1, set_number: 1, completed_reps: 10, completed_at: new Date() }]

vi.mock('./database', () => ({
  initStore: (...args: unknown[]) => mockInitStore(...args),
  getSnapshot: () => mockGetSnapshot(),
}))

// ---------------------------------------------------------------------------
// saveSnapshot
// ---------------------------------------------------------------------------
describe('saveSnapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInsert.mockResolvedValue({ error: null })
    mockGetSnapshot.mockReturnValue({ blocks: mockBlocks, workouts: mockWorkouts, progress: mockProgress })
  })

  it('inserts to the snapshots table with user_id and data', async () => {
    await saveSnapshot('user-123')
    expect(mockInsert).toHaveBeenCalledWith(
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
    const [call] = mockInsert.mock.calls
    expect(call[0].data.savedAt).toBeDefined()
    expect(typeof call[0].data.savedAt).toBe('string')
  })

  it('includes a label when provided', async () => {
    await saveSnapshot('user-123', 'before deload')
    const [call] = mockInsert.mock.calls
    expect(call[0].label).toBe('before deload')
  })

  it('omits label key when not provided', async () => {
    await saveSnapshot('user-123')
    const [call] = mockInsert.mock.calls
    expect(call[0]).not.toHaveProperty('label')
  })

  it('logs an error to console when insert fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockInsert.mockResolvedValue({ error: { message: 'DB error' } })
    await saveSnapshot('user-123')
    expect(consoleSpy).toHaveBeenCalledWith('Snapshot save failed:', expect.objectContaining({ message: 'DB error' }))
    consoleSpy.mockRestore()
  })

  it('does not throw when insert fails', async () => {
    mockInsert.mockResolvedValue({ error: { message: 'DB error' } })
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
    mockLimit.mockReturnValue({ single: mockSingle })
    mockOrder.mockReturnValue({ limit: mockLimit })
    mockEq.mockReturnValue({ order: mockOrder })
    mockSelect.mockReturnValue({ eq: mockEq })
  })

  it('queries the snapshots table ordered by saved_at desc', async () => {
    const { supabase } = await import('./supabase')
    await restoreSnapshot('user-456')
    expect(supabase.from).toHaveBeenCalledWith('snapshots')
    expect(mockSelect).toHaveBeenCalledWith('data')
    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-456')
    expect(mockOrder).toHaveBeenCalledWith('saved_at', { ascending: false })
    expect(mockLimit).toHaveBeenCalledWith(1)
  })

  it('calls initStore with data from the latest snapshot', async () => {
    await restoreSnapshot('user-456')
    expect(mockInitStore).toHaveBeenCalledWith({
      blocks: mockBlocks,
      workouts: mockWorkouts,
      progress: mockProgress,
    })
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

  it('does not call initStore when no snapshot is found', async () => {
    mockSingle.mockResolvedValue({ data: null, error: null })
    await restoreSnapshot('user-456')
    expect(mockInitStore).not.toHaveBeenCalled()
  })
})
