import { useState } from 'react';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { WorkoutsTab } from './components/WorkoutsTab';
import { CoachingTab } from './components/CoachingTab';
import { ProgressTab } from './components/ProgressTab';
import { BlockProvider, useBlock } from './context/BlockContext';
import { AuthProvider } from './context/AuthContext';
import { AuthGate } from './components/AuthGate';
import { useSync } from './hooks/useSync';
import './App.css';

function AppContent() {
  const [activeTab, setActiveTab] = useState('workouts');
  const [compactMode, setCompactMode] = useState(false);
  const [workoutStartTime, setWorkoutStartTime] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [pausedElapsedMs, setPausedElapsedMs] = useState(0);
  const { reloadBlocks } = useBlock();
  useSync(reloadBlocks);

  const handleCompactModeChange = (compact: boolean) => {
    setCompactMode(compact);
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

  const handlePauseWorkout = () => {
    if (workoutStartTime !== null) {
      setPausedElapsedMs(Date.now() - workoutStartTime);
    }
    setCompactMode(false);
    setWorkoutStartTime(null);
    setIsPaused(true);
  };

  const handleTabChange = (tab: string) => {
    if (tab !== 'workouts') {
      setCompactMode(false);
      setWorkoutStartTime(null);
      setIsPaused(false);
      setPausedElapsedMs(0);
    }
    setActiveTab(tab);
  };

  return (
    <div className="h-dvh flex flex-col bg-background transition-colors overflow-hidden">
      <Header />

      <div
        className={`flex-1 container mx-auto ${
          activeTab === 'coaching' ? 'overflow-hidden' : 'overflow-y-auto'
        } ${activeTab === 'workouts' ? 'md:px-4 md:py-4' : 'px-4 py-4'}`}
      >
        {activeTab === 'workouts' && (
          <WorkoutsTab
            onNavigateToConfig={() => handleTabChange('coaching')}
            compactMode={compactMode}
            onCompactModeChange={handleCompactModeChange}
            onPauseWorkout={handlePauseWorkout}
            workoutStartTime={workoutStartTime}
            isPaused={isPaused}
            pausedElapsedMs={pausedElapsedMs}
          />
        )}
        {activeTab === 'coaching' && <CoachingTab />}
        {activeTab === 'progress' && <ProgressTab />}
      </div>

      {!(compactMode && activeTab === 'workouts') && (
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BlockProvider>
        <AuthGate>
          <AppContent />
        </AuthGate>
      </BlockProvider>
    </AuthProvider>
  );
}

export default App;
