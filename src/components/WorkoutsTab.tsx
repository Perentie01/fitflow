import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import { WorkoutCard } from './WorkoutCard';
import { Carousel } from './Carousel';
import { ScrollSnapContainer } from './ScrollSnapContainer';
import { ScrollSnapSection } from './ScrollSnapSection';
import { BlockSelector } from './BlockSelector';
import { useBlock } from '../context/BlockContext';
import { dbHelpers, Workout } from '../lib/database';
import { groupWorkoutsByCategory } from '../lib/workoutUtils';

interface WorkoutsTabProps {
  onNavigateToConfig: () => void;
}

export function WorkoutsTab({ onNavigateToConfig }: WorkoutsTabProps) {
  const { activeBlock, blocks } = useBlock();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>('');

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
      <BlockSelector />

      {availableDays.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 pb-3 md:px-1">
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
                    <WorkoutCard key={workout.id} workout={workout} onProgressUpdate={() => {}} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Mobile — scroll-snap carousel per category */}
          <ScrollSnapContainer>
            {Object.entries(grouped).map(([category, categoryWorkouts]) => (
              <ScrollSnapSection key={category}>
                <h3 className="font-display text-2xl mb-4 flex items-center space-x-2">
                  <span>{category}</span>
                  <Badge variant="secondary" className="text-xs">
                    {categoryWorkouts.length}
                  </Badge>
                </h3>
                <div className="flex-1 flex items-center justify-center">
                  <Carousel
                    items={categoryWorkouts}
                    renderItem={(workout) => (
                      <WorkoutCard workout={workout} onProgressUpdate={() => {}} />
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
