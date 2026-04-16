import React from 'react';
import { Dumbbell, Settings, BarChart3 } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const tabs = [
    { id: 'progress', label: 'Progress', icon: BarChart3 },
    { id: 'workouts', label: 'Workouts', icon: Dumbbell },
    { id: 'config', label: 'Config', icon: Settings }
  ];

  return (
    <div className="shrink-0 bg-card border-t border-border px-4 py-2 safe-area-pb">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-colors ${
              activeTab === id
                ? 'text-primary bg-accent'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Icon className="h-5 w-5" />
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

