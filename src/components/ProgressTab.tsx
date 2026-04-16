import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Weight, Timer } from 'lucide-react';
import { dbHelpers, Progress, Workout } from '../lib/database';

type ProgressWithWorkout = Progress & { workout?: Workout };

interface WorkoutSession {
  block_id: string;
  day: string;
  date: Date;
  exercises: Array<{
    name: string;
    category: string;
    sets: Array<{
      set_number: number;
      reps?: number;
      weight?: number;
      duration?: number;
      notes?: string;
    }>;
  }>;
}

interface ExerciseHistoryEntry {
  date: Date;
  weight: number;
  reps?: number;
  set_number: number;
  block_id: string;
  day: string;
}

export function ProgressTab() {
  const [progressData, setProgressData] = useState<ProgressWithWorkout[]>([]);
  const [selectedView, setSelectedView] = useState<'workouts' | 'exercises'>('workouts');

  useEffect(() => {
    dbHelpers
      .getProgressWithWorkoutDetails()
      .then(setProgressData)
      .catch((error) => console.error('Error loading progress:', error));
  }, []);

  const workoutSessions = useMemo<WorkoutSession[]>(() => {
    const sessionsMap = new Map<string, WorkoutSession & { exercises: Map<string, WorkoutSession['exercises'][number]> }>();

    progressData.forEach((progress) => {
      if (!progress.workout) return;

      const dateStr = new Date(progress.completed_at).toDateString();
      const sessionKey = `${progress.workout.block_id}-${progress.workout.day}-${dateStr}`;

      if (!sessionsMap.has(sessionKey)) {
        sessionsMap.set(sessionKey, {
          block_id: progress.workout.block_id,
          day: progress.workout.day,
          date: new Date(progress.completed_at),
          exercises: new Map(),
        });
      }

      const session = sessionsMap.get(sessionKey)!;
      const exerciseKey = progress.workout.exercise_name;

      if (!session.exercises.has(exerciseKey)) {
        session.exercises.set(exerciseKey, {
          name: progress.workout.exercise_name,
          category: progress.workout.category,
          sets: [],
        });
      }

      session.exercises.get(exerciseKey)!.sets.push({
        set_number: progress.set_number,
        reps: progress.completed_reps,
        weight: progress.completed_weight,
        duration: progress.completed_duration,
        notes: progress.notes,
      });
    });

    return Array.from(sessionsMap.values())
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .map((session) => ({
        ...session,
        exercises: Array.from(session.exercises.values()),
      }));
  }, [progressData]);

  const exerciseHistory = useMemo<Map<string, ExerciseHistoryEntry[]>>(() => {
    const history = new Map<string, ExerciseHistoryEntry[]>();

    progressData.forEach((progress) => {
      if (!progress.completed_weight || !progress.workout) return;

      const name = progress.workout.exercise_name;
      if (!history.has(name)) history.set(name, []);

      history.get(name)!.push({
        date: new Date(progress.completed_at),
        weight: progress.completed_weight,
        reps: progress.completed_reps,
        set_number: progress.set_number,
        block_id: progress.workout.block_id,
        day: progress.workout.day,
      });
    });

    history.forEach((entries) => entries.sort((a, b) => b.date.getTime() - a.date.getTime()));
    return history;
  }, [progressData]);

  return (
    <div className="space-y-4 pb-20">
      <div className="flex gap-2 sticky top-0 bg-background z-10 py-2">
        <Button
          variant={selectedView === 'workouts' ? 'default' : 'outline'}
          onClick={() => setSelectedView('workouts')}
          className="flex-1"
        >
          Previous Workouts
        </Button>
        <Button
          variant={selectedView === 'exercises' ? 'default' : 'outline'}
          onClick={() => setSelectedView('exercises')}
          className="flex-1"
        >
          Exercise History
        </Button>
      </div>

      {selectedView === 'workouts' && (
        <div className="space-y-3">
          {workoutSessions.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No workouts logged yet</p>
                <p className="text-sm mt-2">
                  Complete exercises in the Workouts tab to track progress
                </p>
              </CardContent>
            </Card>
          ) : (
            workoutSessions.map((session, idx) => (
              <Card key={idx} className="overflow-hidden">
                <div className="bg-muted px-4 py-3 border-b border-border">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-display text-base">
                        {session.date.toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                      <div className="font-mono text-xs text-muted-foreground mt-0.5">
                        {session.block_id} • {session.day}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {session.exercises.length}{' '}
                      {session.exercises.length === 1 ? 'exercise' : 'exercises'}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {session.exercises.map((exercise, exIdx) => (
                      <div
                        key={exIdx}
                        className="px-4 py-3 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-medium">{exercise.name}</div>
                          <Badge variant="outline" className="text-xs">
                            {exercise.category}
                          </Badge>
                        </div>
                        <div className="space-y-1.5">
                          {exercise.sets.map((set, setIdx) => (
                            <div
                              key={setIdx}
                              className="flex justify-between items-center text-sm"
                            >
                              <span className="font-mono text-xs text-muted-foreground">Set {set.set_number}</span>
                              <div className="flex gap-3 items-center">
                                {set.reps && (
                                  <div className="flex items-center gap-1">
                                    <span className="font-mono font-medium">{set.reps}</span>
                                    <span className="text-xs text-muted-foreground">reps</span>
                                  </div>
                                )}
                                {set.weight && (
                                  <div className="flex items-center gap-1">
                                    <Weight className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="font-mono font-medium">{set.weight}</span>
                                    <span className="text-xs text-muted-foreground">kg</span>
                                  </div>
                                )}
                                {set.duration && (
                                  <div className="flex items-center gap-1">
                                    <Timer className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="font-mono font-medium">{set.duration}</span>
                                    <span className="text-xs text-muted-foreground">min</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        {exercise.sets.some((s) => s.notes) && (
                          <div className="mt-2 text-xs italic text-muted-foreground border-l-2 border-primary/40 pl-2">
                            {exercise.sets.find((s) => s.notes)?.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {selectedView === 'exercises' && (
        <div className="space-y-3">
          {exerciseHistory.size === 0 ? (
            <Card>
              <CardContent className="text-center py-12 text-muted-foreground">
                <Weight className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No weight exercises logged yet</p>
                <p className="text-sm mt-2">Log exercises with weights to track progression</p>
              </CardContent>
            </Card>
          ) : (
            Array.from(exerciseHistory.entries()).map(([exerciseName, history]) => (
              <Card key={exerciseName}>
                <CardHeader className="pb-3">
                  <CardTitle className="font-display text-base font-normal flex justify-between items-center">
                    <span>{exerciseName}</span>
                    <Badge variant="outline" className="text-xs font-normal">
                      {history.length} {history.length === 1 ? 'entry' : 'entries'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-0 divide-y divide-border">
                    {history.slice(0, 10).map((entry, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center py-2.5 first:pt-0"
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {entry.date.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year:
                                entry.date.getFullYear() !== new Date().getFullYear()
                                  ? 'numeric'
                                  : undefined,
                            })}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {entry.block_id} • {entry.day}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="flex items-baseline gap-1">
                              <span className="font-mono font-semibold text-xl">{entry.weight}</span>
                              <span className="text-xs text-muted-foreground">kg</span>
                            </div>
                            {entry.reps && (
                              <div className="font-mono text-xs text-muted-foreground">
                                {entry.reps} reps · Set {entry.set_number}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {history.length > 10 && (
                      <div className="text-center text-xs text-muted-foreground pt-3">
                        +{history.length - 10} more{' '}
                        {history.length - 10 === 1 ? 'entry' : 'entries'}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
