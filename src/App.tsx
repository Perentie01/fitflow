import { useState } from 'react';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { WorkoutsTab } from './components/WorkoutsTab';
import { CoachingTab } from './components/CoachingTab';
import { ProgressTab } from './components/ProgressTab';
import { BlockProvider, useBlock } from './context/BlockContext';
import { AuthProvider } from './context/AuthContext';
import { AuthGate } from './components/AuthGate';
import { WorkoutModeProvider, useWorkoutMode } from './context/WorkoutModeContext';
import { useSync } from './hooks/useSync';
import './App.css';

function AppContent() {
  const [activeTab, setActiveTab] = useState('workouts');
  const { compactMode, resetWorkout } = useWorkoutMode();
  const { reloadBlocks } = useBlock();
  useSync(reloadBlocks);

  const handleTabChange = (tab: string) => {
    if (tab !== 'workouts') resetWorkout();
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
          <WorkoutsTab onNavigateToConfig={() => handleTabChange('coaching')} />
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
        <WorkoutModeProvider>
          <AuthGate>
            <AppContent />
          </AuthGate>
        </WorkoutModeProvider>
      </BlockProvider>
    </AuthProvider>
  );
}

export default App;
