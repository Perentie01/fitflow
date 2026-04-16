import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Timer, Weight, Check, Brain, ChevronDown, ChevronUp } from 'lucide-react';
import { Workout, dbHelpers } from '../lib/database';
import { getCategoryColor } from '../lib/workoutUtils';
import type { SetProgress } from '../lib/types';

interface WorkoutCardProps {
  workout: Workout;
  onProgressUpdate?: () => void;
}

export function WorkoutCard({ workout, onProgressUpdate }: WorkoutCardProps) {
  const [setProgress, setSetProgress] = useState<SetProgress[]>([]);
  const [isLogging, setIsLogging] = useState(false);
  const [showProgressForm, setShowProgressForm] = useState(false);
  const [cuesExpanded, setCuesExpanded] = useState(false);
  const [descriptionDialogOpen, setDescriptionDialogOpen] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [hasLoggedProgress, setHasLoggedProgress] = useState(false);

  React.useEffect(() => {
    initializeSetProgress();
    checkExistingProgress();
  }, [workout]);

  const checkExistingProgress = async () => {
    if (!workout.id) return;
    try {
      const existing = await dbHelpers.getProgressByWorkout(workout.id);
      if (existing.length > 0) setHasLoggedProgress(true);
    } catch (error) {
      console.error('Error checking existing progress:', error);
    }
  };

  const initializeSetProgress = () => {
    setSetProgress(
      Array.from({ length: workout.sets }, (_, index) => ({
        set_number: index + 1,
        completed_reps: workout.type === 'weights' ? workout.reps : undefined,
        completed_weight:
          workout.type === 'weights' && workout.weight ? workout.weight : undefined,
        completed_duration: workout.type === 'time' ? workout.duration : undefined,
        notes: '',
      })),
    );
  };

  const updateSetProgress = (
    setIndex: number,
    field: keyof SetProgress,
    value: string | number,
  ) => {
    setSetProgress((prev) =>
      prev.map((set, index) => (index === setIndex ? { ...set, [field]: value } : set)),
    );
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
          notes: set.notes,
        });
      }
      setShowProgressForm(false);
      setHasLoggedProgress(true);
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 2000);
      onProgressUpdate?.();
    } catch (error) {
      console.error('Error saving progress:', error);
    } finally {
      setIsLogging(false);
    }
  };

  const getTypeIcon = () => {
    switch (workout.type) {
      case 'weights':  return <Weight className="h-3 w-3" />;
      case 'time':     return <Timer className="h-3 w-3" />;
      case 'mindset':  return <Brain className="h-3 w-3" />;
      default:         return null;
    }
  };

  const cuesAreLong = workout.cues && workout.cues.length > 60;
  const displayedCues =
    cuesExpanded || !cuesAreLong ? workout.cues : workout.cues?.substring(0, 60) + '...';

  const isMindsetExercise = workout.type === 'mindset';
  const showWeight = workout.type === 'weights';

  return (
    <Card className="w-full">
      <CardHeader className="pb-1">
        <div className="flex justify-between items-start">
          <button
            onClick={() => workout.description && setDescriptionDialogOpen(true)}
            className={`text-lg font-semibold text-left ${
              workout.description ? 'hover:text-primary cursor-pointer' : ''
            }`}
          >
            {workout.exercise_name}
          </button>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="flex items-center space-x-1">
              {getTypeIcon()}
              <span>{workout.type}</span>
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {!isMindsetExercise && workout.category !== 'Intent' && (
          <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
            <div>Sets: <span className="font-mono text-foreground">{workout.sets}</span></div>
            {workout.type === 'weights' && (
              <>
                <div>Reps: <span className="font-mono text-foreground">{workout.reps || '-'}</span></div>
                {showWeight && <div>Weight: <span className="font-mono text-foreground">{workout.weight}kg</span></div>}
                {workout.resistance && (
                  <div className="col-span-2">Resistance: <span className="font-mono text-foreground">{workout.resistance}</span></div>
                )}
              </>
            )}
            {workout.type === 'time' && <div>Duration: <span className="font-mono text-foreground">{workout.duration}min</span></div>}
            {workout.type === 'cardio' && (
              <>
                {workout.duration != null && <div>Duration: <span className="font-mono text-foreground">{workout.duration}min</span></div>}
                {workout.distance != null && <div>Distance: <span className="font-mono text-foreground">{workout.distance}m</span></div>}
              </>
            )}
            <div>Rest: <span className="font-mono text-foreground">{workout.rest}s</span></div>
          </div>
        )}

        {workout.guidance && (
          <p className="text-sm text-muted-foreground break-words">
            {workout.guidance}
          </p>
        )}

        {workout.cues && (
          <div className="p-2 bg-muted border-l-4 border-muted-foreground/40 rounded-r-md">
            <div className="flex justify-between items-center mb-1">
              <div className="text-xs font-medium text-muted-foreground tracking-wide">FORM CUES</div>
              {cuesAreLong && (
                <button
                  onClick={() => setCuesExpanded(!cuesExpanded)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {cuesExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>
            <p className="text-sm text-foreground break-words">{displayedCues}</p>
          </div>
        )}

        {!isMindsetExercise && workout.category !== 'Intent' && !showProgressForm && (
          <div className="relative">
            <Button
              onClick={() => setShowProgressForm(true)}
              className={
                hasLoggedProgress
                  ? 'w-full bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-800 dark:hover:bg-emerald-900 text-white'
                  : 'w-full'
              }
              variant={hasLoggedProgress ? 'default' : 'outline'}
            >
              {hasLoggedProgress ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Progress Logged
                </>
              ) : (
                'Log Progress'
              )}
            </Button>
            {showSaveSuccess && (
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-green-500 text-white text-xs px-3 py-1 rounded shadow-lg">
                ✓ Saved
              </div>
            )}
          </div>
        )}

        {showProgressForm && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="font-medium">Log Progress</h4>
            </div>

            {workout.type === 'weights' && (
              <p className="text-xs text-muted-foreground">
                Enter the actual reps and weight you performed for each set
              </p>
            )}

            <div className="flex justify-end items-center">
              <div className="space-x-2">
                <Button size="sm" variant="outline" onClick={() => setShowProgressForm(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={saveProgress} disabled={isLogging}>
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
                            onChange={(e) =>
                              updateSetProgress(index, 'completed_reps', parseInt(e.target.value) || 0)
                            }
                            className="h-8"
                            placeholder={workout.reps?.toString() || ''}
                          />
                        </div>
                        {showWeight && (
                          <div>
                            <label className="text-xs text-muted-foreground">Weight (kg)</label>
                            <Input
                              type="number"
                              step="0.5"
                              value={set.completed_weight || ''}
                              onChange={(e) =>
                                updateSetProgress(
                                  index,
                                  'completed_weight',
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                              className="h-8"
                              placeholder={workout.weight?.toString() || ''}
                            />
                          </div>
                        )}
                      </>
                    )}

                    {workout.type === 'time' && (
                      <div className="col-span-2">
                        <label className="text-xs text-muted-foreground">Duration (min)</label>
                        <Input
                          type="number"
                          step="0.1"
                          value={set.completed_duration || ''}
                          onChange={(e) =>
                            updateSetProgress(
                              index,
                              'completed_duration',
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          className="h-8"
                          placeholder={workout.duration?.toString() || ''}
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

      <Dialog open={descriptionDialogOpen} onOpenChange={setDescriptionDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{workout.exercise_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {workout.description && (
              <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                {workout.description}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
