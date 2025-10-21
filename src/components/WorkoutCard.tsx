import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Timer, Weight, CheckCircle } from 'lucide-react';
import { Workout, Progress, dbHelpers } from '../lib/database';

interface WorkoutCardProps {
  workout: Workout;
  onProgressUpdate?: () => void;
}

interface SetProgress {
  set_number: number;
  completed_reps?: number;
  completed_weight?: number;
  completed_duration?: number;
  notes?: string;
}

export function WorkoutCard({ workout, onProgressUpdate }: WorkoutCardProps) {
  const [setProgress, setSetProgress] = useState<SetProgress[]>([]);
  const [isLogging, setIsLogging] = useState(false);
  const [showProgressForm, setShowProgressForm] = useState(false);

  React.useEffect(() => {
    initializeSetProgress();
  }, [workout]);

  const initializeSetProgress = () => {
    const sets = Array.from({ length: workout.sets }, (_, index) => ({
      set_number: index + 1,
      completed_reps: workout.type === 'weights' ? workout.reps : undefined,
      completed_weight: workout.type === 'weights' ? workout.weight : undefined,
      completed_duration: workout.type === 'time' ? workout.duration : undefined,
      notes: ''
    }));
    setSetProgress(sets);
  };

  const updateSetProgress = (setIndex: number, field: keyof SetProgress, value: string | number) => {
    setSetProgress(prev => prev.map((set, index) => 
      index === setIndex ? { ...set, [field]: value } : set
    ));
  };

  const saveProgress = async () => {
    if (!workout.id) return;

    try {
      setIsLogging(true);
      
      for (const set of setProgress) {
        await dbHelpers.saveProgress({
          workout_id: workout.id,
          set_number: set.set_number,
          completed_reps: set.completed_reps,
          completed_weight: set.completed_weight,
          completed_duration: set.completed_duration,
          notes: set.notes
        });
      }

      setShowProgressForm(false);
      onProgressUpdate?.();
    } catch (error) {
      console.error('Error saving progress:', error);
    } finally {
      setIsLogging(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Warm-up': return 'bg-orange-100 text-orange-800';
      case 'Primary': return 'bg-blue-100 text-blue-800';
      case 'Secondary': return 'bg-green-100 text-green-800';
      case 'Additional': return 'bg-purple-100 text-purple-800';
      case 'Cool-down': return 'bg-cyan-100 text-cyan-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-semibold">{workout.exercise_name}</CardTitle>
          <div className="flex items-center space-x-2">
            <Badge className={getCategoryColor(workout.category)}>
              {workout.category}
            </Badge>
            <Badge variant="outline" className="flex items-center space-x-1">
              {workout.type === 'weights' ? <Weight className="h-3 w-3" /> : <Timer className="h-3 w-3" />}
              <span>{workout.type}</span>
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Exercise Details */}
        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
          <div>Sets: {workout.sets}</div>
          {workout.type === 'weights' && (
            <>
              <div>Reps: {workout.reps}</div>
              <div>Weight: {workout.weight}kg</div>
            </>
          )}
          {workout.type === 'time' && (
            <div>Duration: {workout.duration}min</div>
          )}
          <div>Rest: {workout.rest}s</div>
        </div>

        {/* Exercise Cues */}
        {workout.cues && (
          <div className="p-3 bg-blue-50 border-l-4 border-blue-400 rounded-r-md">
            <div className="text-xs font-medium text-blue-700 mb-1">FORM CUES</div>
            <p className="text-sm text-blue-800">{workout.cues}</p>
          </div>
        )}

        {/* Progress Logging */}
        {!showProgressForm ? (
          <Button 
            onClick={() => setShowProgressForm(true)}
            className="w-full"
            variant="outline"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Log Progress
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="font-medium">Log Progress</h4>
              <div className="space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowProgressForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={saveProgress}
                  disabled={isLogging}
                >
                  {isLogging ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {setProgress.map((set, index) => (
                <div key={set.set_number} className="p-3 border rounded-lg bg-muted/50">
                  <div className="text-sm font-medium mb-2">Set {set.set_number}</div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {workout.type === 'weights' && (
                      <>
                        <div>
                          <label className="text-xs text-muted-foreground">Reps</label>
                          <Input
                            type="number"
                            value={set.completed_reps || ''}
                            onChange={(e) => updateSetProgress(index, 'completed_reps', parseInt(e.target.value) || 0)}
                            className="h-8"
                            placeholder={workout.reps?.toString()}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Weight (kg)</label>
                          <Input
                            type="number"
                            step="0.5"
                            value={set.completed_weight || ''}
                            onChange={(e) => updateSetProgress(index, 'completed_weight', parseFloat(e.target.value) || 0)}
                            className="h-8"
                            placeholder={workout.weight?.toString()}
                          />
                        </div>
                      </>
                    )}
                    
                    {workout.type === 'time' && (
                      <div className="col-span-2">
                        <label className="text-xs text-muted-foreground">Duration (min)</label>
                        <Input
                          type="number"
                          step="0.1"
                          value={set.completed_duration || ''}
                          onChange={(e) => updateSetProgress(index, 'completed_duration', parseFloat(e.target.value) || 0)}
                          className="h-8"
                          placeholder={workout.duration?.toString()}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

