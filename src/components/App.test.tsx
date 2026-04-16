import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';

// Mock Supabase to avoid env var requirements in tests
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn().mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    }),
  },
}));

// Mock database to avoid IndexedDB in jsdom
vi.mock('../lib/database', () => ({
  db: {
    workouts: { where: vi.fn().mockReturnThis(), equals: vi.fn().mockReturnThis(), toArray: vi.fn().mockResolvedValue([]) },
    progress: { where: vi.fn().mockReturnThis(), equals: vi.fn().mockReturnThis(), toArray: vi.fn().mockResolvedValue([]), clear: vi.fn() },
    blocks: { where: vi.fn().mockReturnThis(), equals: vi.fn().mockReturnThis(), toArray: vi.fn().mockResolvedValue([]), first: vi.fn().mockResolvedValue(undefined), orderBy: vi.fn().mockReturnThis(), reverse: vi.fn().mockReturnThis(), add: vi.fn().mockResolvedValue(1), clear: vi.fn() },
  },
  dbHelpers: {
    getAllBlocks: vi.fn().mockResolvedValue([]),
    getActiveBlock: vi.fn().mockResolvedValue(undefined),
    setActiveBlock: vi.fn().mockResolvedValue(undefined),
    getWorkoutsByBlock: vi.fn().mockResolvedValue([]),
    getProgressByWorkout: vi.fn().mockResolvedValue([]),
    getProgressWithWorkoutDetails: vi.fn().mockResolvedValue([]),
    clearAllData: vi.fn().mockResolvedValue(undefined),
    createBlock: vi.fn().mockResolvedValue(1),
    importWorkouts: vi.fn().mockResolvedValue(undefined),
    exportBlockData: vi.fn().mockResolvedValue({ workouts: [], progress: [] }),
  },
  initializeDefaultBlock: vi.fn().mockResolvedValue({
    id: 1, block_id: 'Block 1', block_name: 'Block 1', is_active: 1, created_at: new Date(),
  }),
  FitFlowDatabase: vi.fn(),
}));

describe('App — tab content switching', () => {
  it('shows Config content when Config tab is clicked', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Config')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Config'));
    await waitFor(() => {
      expect(screen.getByText('Import Workouts')).toBeInTheDocument();
      expect(screen.getByText('Clear All Data')).toBeInTheDocument();
    });
  });

  it('shows Progress content when Progress tab is clicked', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Progress')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Progress'));
    await waitFor(() => {
      expect(screen.getByText('No workouts logged yet')).toBeInTheDocument();
    });
  });

  it('returns to Workouts content from Config', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Config')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Config'));
    await waitFor(() => expect(screen.getByText('Import Workouts')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Workouts'));
    await waitFor(() => {
      expect(screen.queryByText('Import Workouts')).not.toBeInTheDocument();
    });
  });
});
