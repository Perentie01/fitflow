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

  return (
    <BlockProvider>
      <div className="min-h-screen bg-background transition-colors">
        <Header />

        <div
          className={`container mx-auto ${
            activeTab === 'workouts' ? 'md:px-4 md:py-4' : 'px-4 py-4'
          }`}
        >
          {activeTab === 'workouts' && (
            <WorkoutsTab onNavigateToConfig={() => setActiveTab('config')} />
          )}
          {activeTab === 'config' && <ConfigTab />}
          {activeTab === 'progress' && <ProgressTab />}
        </div>

        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </BlockProvider>
  );
}

export default App;
