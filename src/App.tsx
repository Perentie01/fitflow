import { useState } from 'react';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { WorkoutsTab } from './components/WorkoutsTab';
import { ConfigTab } from './components/ConfigTab';
import { ProgressTab } from './components/ProgressTab';
import { BlockProvider, useBlock } from './context/BlockContext';
import { AuthProvider } from './context/AuthContext';
import { useSync } from './hooks/useSync';
import './App.css';

function AppContent() {
  const [activeTab, setActiveTab] = useState('workouts');
  const [compactMode, setCompactMode] = useState(false);
  const [workoutStartTime, setWorkoutStartTime] = useState<number | null>(null);
  const { reloadBlocks } = useBlock();

  useSync(() => reloadBlocks());

  const handleCompactModeChange = (compact: boolean) => {
    setCompactMode(compact);
    setWorkoutStartTime(compact ? Date.now() : null);
  };

  // Exit compact mode when leaving workouts tab
  const handleTabChange = (tab: string) => {
    if (tab !== 'workouts') {
      setCompactMode(false);
      setWorkoutStartTime(null);
    }
    setActiveTab(tab);
  };

  return (
    <div className="h-dvh flex flex-col bg-background transition-colors overflow-hidden">
      {!(compactMode && activeTab === 'workouts') && <Header />}

      <div
        className={`flex-1 overflow-y-auto container mx-auto ${
          activeTab === 'workouts' ? 'md:px-4 md:py-4' : 'px-4 py-4'
        }`}
      >
        {activeTab === 'workouts' && (
          <WorkoutsTab
            onNavigateToConfig={() => handleTabChange('config')}
            compactMode={compactMode}
            onCompactModeChange={handleCompactModeChange}
            workoutStartTime={workoutStartTime}
          />
        )}
        {activeTab === 'config' && <ConfigTab />}
        {activeTab === 'progress' && <ProgressTab />}
      </div>

      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BlockProvider>
        <AppContent />
      </BlockProvider>
    </AuthProvider>
  );
}

export default App;
