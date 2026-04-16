import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, X } from 'lucide-react';
import { WorkoutCard } from './WorkoutCard';
import { Carousel } from './Carousel';
import { ScrollSnapContainer } from './ScrollSnapContainer';
import { ScrollSnapSection } from './ScrollSnapSection';
import { BlockSelector } from './BlockSelector';
import { useBlock } from '../context/BlockContext';
import { dbHelpers, Workout } from '../lib/database';
import { groupWorkoutsByCategory } from '../lib/workoutUtils';

function useElapsedTime(startTime: number | null) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startTime) { setElapsed(0); return; }
    setElapsed(Math.floor((Date.now() - startTime) / 1000));
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(id);
  }, [startTime]);

  const hrs = Math.floor(elapsed / 3600);
  const mins = Math.floor((elapsed % 3600) / 60);
  const secs = elapsed % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');

  return hrs > 0 ? `${pad(hrs)}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
}

interface WorkoutsTabProps {
  onNavigateToConfig: () => void;
  compactMode?: boolean;
  onCompactModeChange?: (compact: boolean) => void;
  workoutStartTime?: number | null;
}

export function WorkoutsTab({ onNavigateToConfig, compactMode = false, onCompactModeChange, workoutStartTime = null }: WorkoutsTabProps) {
  const { activeBlock, blocks } = useBlock();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>('');
  const elapsedDisplay = useElapsedTime(workoutStartTime);

  useEffect(() => {
    if (activeBlock) {
      loadWorkoutsForBlock(activeBlock.block_id);
    }
  }, [activeBlock]);

  const loadWorkoutsForBlock = async (blockId: string) => {
    const blockWorkouts = await dbHelpers.getWorkoutsByBlock(blockId);
    setWorkouts(blockWorkouts);

    const daysArr = blockWorkouts.map((w) => w.day);
    const days = daysArr.filter((d, i) => daysArr.indexOf(d) === i).sort();
    setAvailableDays(days);

    if (days.length > 0 && !days.includes(selectedDay)) {
      setSelectedDay(days[0]);
    }
  };

  if (!activeBlock || blocks.length === 0) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <h1 className="font-display text-4xl text-muted-foreground/40">FitFlow</h1>
      </div>
    );
  }

  const dayWorkouts = workouts.filter((w) => w.day === selectedDay);
  const grouped = groupWorkoutsByCategory(dayWorkouts);

  return (
    <div className="md:space-y-3">
      {/* Compact header — mobile only, visible when workout started */}
      {compactMode && (
        <div className="md:hidden flex items-center justify-between px-4 py-2 border-b border-border bg-card">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-display text-lg truncate">{activeBlock?.block_name}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-sm font-medium text-muted-foreground truncate">{selectedDay}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-clock text-sm text-muted-foreground/70">{elapsedDisplay}</span>
            <button
              onClick={() => onCompactModeChange?.(false)}
              className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Exit compact mode"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Full header — hidden on mobile in compact mode */}
      <div className={compactMode ? 'hidden md:block' : ''}>
        <BlockSelector />
      </div>

      {availableDays.length > 0 && (
        <div className={`flex flex-wrap gap-2 px-4 pb-3 md:px-1 ${compactMode ? 'hidden md:flex' : ''}`}>
          {availableDays.map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                selectedDay === day
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              {day}
            </button>
          ))}
        </div>
      )}

      {selectedDay && (
        <>
          {/* Desktop — traditional list */}
          <div className="hidden md:block space-y-4">
            {Object.entries(grouped).map(([category, categoryWorkouts]) => (
              <div key={category}>
                <h3 className="font-display text-xl mb-3 flex items-center space-x-2">
                  <span>{category}</span>
                  <Badge variant="secondary" className="text-xs">
                    {categoryWorkouts.length}
                  </Badge>
                </h3>
                <div className="flex flex-col gap-3">
                  {categoryWorkouts.map((workout) => (
                    <WorkoutCard
                      key={workout.id}
                      workout={workout}
                      onProgressUpdate={() => {}}
                      onBeginWorkout={category === 'Intent' ? () => onCompactModeChange?.(true) : undefined}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Mobile — scroll-snap carousel per category */}
          <ScrollSnapContainer>
            {Object.entries(grouped).map(([category, categoryWorkouts]) => (
              <ScrollSnapSection key={category} compact={compactMode}>
                <h3 className={`font-display flex items-center space-x-2 ${
                  compactMode ? 'text-lg mb-2' : 'text-2xl mb-4'
                }`}>
                  <span>{category}</span>
                  <Badge variant="secondary" className="text-xs">
                    {categoryWorkouts.length}
                  </Badge>
                </h3>
                <div className="flex-1 flex items-center justify-center">
                  <Carousel
                    items={categoryWorkouts}
                    renderItem={(workout) => (
                      <WorkoutCard
                        workout={workout}
                        onProgressUpdate={() => {}}
                        onBeginWorkout={category === 'Intent' ? () => onCompactModeChange?.(true) : undefined}
                      />
                    )}
                    className="w-[85vw] max-w-md"
                  />
                </div>
              </ScrollSnapSection>
            ))}
          </ScrollSnapContainer>
        </>
      )}

      {availableDays.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No workouts for this block</h3>
            <p className="text-muted-foreground mb-4">Import a TSV or CSV file to get started</p>
            <Button onClick={onNavigateToConfig} variant="default" size="sm">
              Import Workouts
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
