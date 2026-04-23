import { createContext, useContext, useState, ReactNode } from 'react';

interface WorkoutModeContextType {
  compactMode: boolean;
  isPaused: boolean;
  workoutStartTime: number | null;
  pausedElapsedMs: number;
  setCompactMode: (compact: boolean) => void;
  pauseWorkout: () => void;
  resetWorkout: () => void;
}

const WorkoutModeContext = createContext<WorkoutModeContextType | null>(null);

export const WorkoutModeProvider = ({ children }: { children: ReactNode }) => {
  const [compactMode, setCompactModeState] = useState(false);
  const [workoutStartTime, setWorkoutStartTime] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [pausedElapsedMs, setPausedElapsedMs] = useState(0);

  const setCompactMode = (compact: boolean) => {
    setCompactModeState(compact);
    if (compact) {
      if (isPaused) {
        setWorkoutStartTime(Date.now() - pausedElapsedMs);
        setIsPaused(false);
      } else {
        setWorkoutStartTime(Date.now());
        setPausedElapsedMs(0);
      }
    } else {
      setWorkoutStartTime(null);
      setIsPaused(false);
      setPausedElapsedMs(0);
    }
  };

  const pauseWorkout = () => {
    if (workoutStartTime !== null) {
      setPausedElapsedMs(Date.now() - workoutStartTime);
    }
    setCompactModeState(false);
    setWorkoutStartTime(null);
    setIsPaused(true);
  };

  const resetWorkout = () => {
    setCompactModeState(false);
    setWorkoutStartTime(null);
    setIsPaused(false);
    setPausedElapsedMs(0);
  };

  return (
    <WorkoutModeContext.Provider value={{ compactMode, isPaused, workoutStartTime, pausedElapsedMs, setCompactMode, pauseWorkout, resetWorkout }}>
      {children}
    </WorkoutModeContext.Provider>
  );
};

export const useWorkoutMode = () => {
  const ctx = useContext(WorkoutModeContext);
  if (!ctx) throw new Error('useWorkoutMode must be used within WorkoutModeProvider');
  return ctx;
};
