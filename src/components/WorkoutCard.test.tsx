import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkoutCard } from './WorkoutCard';
import type { Workout } from '../lib/database';

// Mock Dexie database operations
vi.mock('../lib/database', () => ({
  dbHelpers: {
    getProgressByWorkout: vi.fn().mockResolvedValue([]),
    saveProgress: vi.fn().mockResolvedValue(1),
  },
}));

const weightsWorkout: Workout = {
  id: 1,
  block_id: 'Week 1',
  day: 'Day 1',
  exercise_name: 'Squats',
  category: 'Primary',
  type: 'weights',
  sets: 3,
  reps: 10,
  weight: 100,
  rest: 90,
  cues: 'Drive through heels',
  guidance: '70% 1RM',
  description: 'Feet shoulder-width apart',
};

const timeWorkout: Workout = {
  id: 2,
  block_id: 'Week 1',
  day: 'Day 1',
  exercise_name: 'Plank',
  category: 'Primary',
  type: 'time',
  sets: 3,
  duration: 1.5,
  rest: 30,
  cues: 'Keep hips level',
};

const mindsetWorkout: Workout = {
  id: 3,
  block_id: 'Week 1',
  day: 'Day 1',
  exercise_name: 'Focus',
  category: 'Intent',
  type: 'mindset',
  sets: 1,
  rest: 0,
  cues: 'Build power today',
};

describe('WorkoutCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the exercise name and category badge', () => {
    render(<WorkoutCard workout={weightsWorkout} />);
    expect(screen.getByText('Squats')).toBeInTheDocument();
    expect(screen.getByText('Primary')).toBeInTheDocument();
  });

  it('renders sets, reps, weight, and rest for weights exercises', () => {
    render(<WorkoutCard workout={weightsWorkout} />);
    expect(screen.getByText('3')).toBeInTheDocument(); // sets
    expect(screen.getByText('10')).toBeInTheDocument(); // reps
    expect(screen.getByText('100kg')).toBeInTheDocument(); // weight
    expect(screen.getByText('90s')).toBeInTheDocument(); // rest
  });

  it('renders guidance block when guidance is provided', () => {
    render(<WorkoutCard workout={weightsWorkout} />);
    expect(screen.getByText('GUIDANCE')).toBeInTheDocument();
    expect(screen.getByText('70% 1RM')).toBeInTheDocument();
  });

  it('renders form cues', () => {
    render(<WorkoutCard workout={weightsWorkout} />);
    expect(screen.getByText('FORM CUES')).toBeInTheDocument();
    expect(screen.getByText('Drive through heels')).toBeInTheDocument();
  });

  it('renders duration for time-based exercises', () => {
    render(<WorkoutCard workout={timeWorkout} />);
    expect(screen.getByText('1.5min')).toBeInTheDocument();
  });

  it('shows Log Progress button for non-mindset exercises', () => {
    render(<WorkoutCard workout={weightsWorkout} />);
    expect(screen.getByText('Log Progress')).toBeInTheDocument();
  });

  it('does not show Log Progress button for mindset exercises', () => {
    render(<WorkoutCard workout={mindsetWorkout} />);
    expect(screen.queryByText('Log Progress')).not.toBeInTheDocument();
  });

  it('shows progress form when Log Progress is clicked', () => {
    render(<WorkoutCard workout={weightsWorkout} />);
    fireEvent.click(screen.getByText('Log Progress'));
    expect(screen.getByText('Log Progress', { selector: 'h4' })).toBeInTheDocument();
    // Should render 3 sets (one per workout.sets)
    expect(screen.getByText('Set 1')).toBeInTheDocument();
    expect(screen.getByText('Set 2')).toBeInTheDocument();
    expect(screen.getByText('Set 3')).toBeInTheDocument();
  });

  it('hides progress form when Cancel is clicked', () => {
    render(<WorkoutCard workout={weightsWorkout} />);
    fireEvent.click(screen.getByText('Log Progress'));
    expect(screen.getByText('Set 1')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Set 1')).not.toBeInTheDocument();
  });

  it('renders type badge showing the workout type', () => {
    render(<WorkoutCard workout={weightsWorkout} />);
    expect(screen.getByText('weights')).toBeInTheDocument();
  });
});
