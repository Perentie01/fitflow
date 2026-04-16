import { useState } from 'react';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { WorkoutsTab } from './components/WorkoutsTab';
import { ConfigTab } from './components/ConfigTab';
import { ProgressTab } from './components/ProgressTab';
import { BlockProvider } from './context/BlockContext';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('workouts');
  const [compactMode, setCompactMode] = useState(false);
  const [workoutStartTime, setWorkoutStartTime] = useState<number | null>(null);

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
    <BlockProvider>
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
    </BlockProvider>
  );
}

export default App;
