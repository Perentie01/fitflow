import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Calendar, ChevronLeft, ChevronRight, Upload } from 'lucide-react';
import { WorkoutCard } from './components/WorkoutCard';
import { BottomNav } from './components/BottomNav';
import { TestDataButton } from './components/TestDataButton';
import { dbHelpers, initializeCurrentWeek, Workout, Week } from './lib/database';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('workouts');
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [activeWeek, setActiveWeek] = useState<Week | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  useEffect(() => {
    if (activeWeek) {
      loadWorkoutsForWeek(activeWeek.week_id);
    }
  }, [activeWeek]);

  const initializeApp = async () => {
    try {
      await initializeCurrentWeek();
      await loadWeeks();
    } catch (error) {
      console.error('Error initializing app:', error);
    }
  };

  const loadWeeks = async () => {
    try {
      const allWeeks = await dbHelpers.getAllWeeks();
      setWeeks(allWeeks);
      
      const active = await dbHelpers.getActiveWeek();
      if (active) {
        setActiveWeek(active);
      } else if (allWeeks.length > 0) {
        setActiveWeek(allWeeks[0]);
        await dbHelpers.setActiveWeek(allWeeks[0].week_id);
      }
    } catch (error) {
      console.error('Error loading weeks:', error);
    }
  };

  const loadWorkoutsForWeek = async (weekId: string) => {
    try {
      const weekWorkouts = await dbHelpers.getWorkoutsByWeek(weekId);
      setWorkouts(weekWorkouts);
      
      const days = [...new Set(weekWorkouts.map(w => w.day))].sort();
      setAvailableDays(days);
      
      if (days.length > 0 && !days.includes(selectedDay)) {
        setSelectedDay(days[0]);
      }
    } catch (error) {
      console.error('Error loading workouts:', error);
    }
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim());
      
      const workoutData: Omit<Workout, 'id'>[] = [];
      const weekIds = new Set<string>();

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length < headers.length) continue;

        const workout: any = {};
        headers.forEach((header, index) => {
          const value = values[index];
          switch (header.toLowerCase()) {
            case 'week_id':
              workout.week_id = value;
              weekIds.add(value);
              break;
            case 'day':
              workout.day = value;
              break;
            case 'exercise_name':
              workout.exercise_name = value;
              break;
            case 'category':
              workout.category = value;
              break;
            case 'type':
              workout.type = value;
              break;
            case 'sets':
              workout.sets = parseInt(value) || 1;
              break;
            case 'reps':
              workout.reps = value ? parseInt(value) : undefined;
              break;
            case 'weight':
              workout.weight = value ? parseFloat(value) : undefined;
              break;
            case 'duration':
              workout.duration = value ? parseFloat(value) : undefined;
              break;
            case 'rest':
              workout.rest = parseInt(value) || 0;
              break;
            case 'cues':
              workout.cues = value || '';
              break;
          }
        });
        
        workoutData.push(workout);
      }

      // Create weeks if they don't exist
      for (const weekId of weekIds) {
        const existingWeek = await dbHelpers.getAllWeeks().then(weeks => 
          weeks.find(w => w.week_id === weekId)
        );
        
        if (!existingWeek) {
          const [year, weekStr] = weekId.split('-W');
          const weekNumber = parseInt(weekStr);
          
          await dbHelpers.createWeek({
            week_id: weekId,
            week_number: weekNumber,
            year: parseInt(year),
            start_date: new Date(),
            end_date: new Date(),
            is_active: 0
          });
        }
      }

      await dbHelpers.importWorkouts(workoutData);
      await loadWeeks();
      
      event.target.value = '';
    } catch (error) {
      console.error('Error importing CSV:', error);
      alert('Error importing CSV file. Please check the format.');
    } finally {
      setIsLoading(false);
    }
  };

  const exportWeekData = async () => {
    if (!activeWeek) return;

    try {
      const { workouts } = await dbHelpers.exportWeekData(activeWeek.week_id);
      
      const headers = ['week_id', 'day', 'exercise_name', 'category', 'type', 'sets', 'reps', 'weight', 'duration', 'rest', 'cues'];
      const csvContent = [
        headers.join(','),
        ...workouts.map(workout => 
          headers.map(header => workout[header as keyof Workout] || '').join(',')
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fitflow-${activeWeek.week_id}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    if (!activeWeek || weeks.length === 0) return;
    
    const currentIndex = weeks.findIndex(w => w.week_id === activeWeek.week_id);
    let newIndex;
    
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : weeks.length - 1;
    } else {
      newIndex = currentIndex < weeks.length - 1 ? currentIndex + 1 : 0;
    }
    
    const newWeek = weeks[newIndex];
    setActiveWeek(newWeek);
    dbHelpers.setActiveWeek(newWeek.week_id);
  };

  const getDayWorkouts = () => {
    if (!selectedDay) return [];
    return workouts.filter(w => w.day === selectedDay);
  };

  const groupWorkoutsByCategory = (workouts: Workout[]) => {
    const categories = ['Warm-up', 'Primary', 'Secondary', 'Additional', 'Cool-down'];
    return categories.reduce((acc, category) => {
      const categoryWorkouts = workouts.filter(w => w.category === category);
      if (categoryWorkouts.length > 0) {
        acc[category] = categoryWorkouts;
      }
      return acc;
    }, {} as Record<string, Workout[]>);
  };

  const renderWorkoutsTab = () => (
    <div className="space-y-4 pb-20">
      {/* Week Navigation */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <div className="font-semibold">{activeWeek?.week_id}</div>
              <div className="text-sm text-muted-foreground">
                Week {activeWeek?.week_number}, {activeWeek?.year}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Day Selection */}
      {availableDays.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Select Day</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {availableDays.map(day => (
                <Button
                  key={day}
                  variant={selectedDay === day ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedDay(day)}
                >
                  {day}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Workouts */}
      {selectedDay && (
        <div className="space-y-4">
          {Object.entries(groupWorkoutsByCategory(getDayWorkouts())).map(([category, categoryWorkouts]) => (
            <div key={category}>
              <h3 className="font-semibold text-lg mb-3 flex items-center space-x-2">
                <span>{category}</span>
                <Badge variant="secondary">{categoryWorkouts.length}</Badge>
              </h3>
              <div className="space-y-3">
                {categoryWorkouts.map((workout) => (
                  <WorkoutCard
                    key={workout.id}
                    workout={workout}
                    onProgressUpdate={() => {}}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {availableDays.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No workouts for this week</h3>
            <p className="text-muted-foreground mb-4">Import a CSV file to get started</p>
            <Button onClick={() => setActiveTab('import')}>
              Import Workouts
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderImportTab = () => (
    <div className="space-y-4 pb-20">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5" />
            <span>Import Workouts</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload a CSV file with your workout routines. The file should include columns: 
            week_id, day, exercise_name, category, type, sets, reps, weight, duration, rest, cues.
          </p>
          <div className="space-y-2">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileImport}
              className="hidden"
              id="csv-upload"
              disabled={isLoading}
            />
            <Button 
              onClick={() => document.getElementById('csv-upload')?.click()}
              disabled={isLoading}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              {isLoading ? 'Importing...' : 'Choose CSV File'}
            </Button>
            <TestDataButton />
            {activeWeek && (
              <Button 
                onClick={exportWeekData}
                variant="outline"
                className="w-full"
              >
                Export Current Week
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>CSV Format Example</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
{`week_id,day,exercise_name,category,type,sets,reps,weight,duration,rest,cues
2024-W01,Monday,Squats,Primary,weights,3,10,100,,90,Keep chest up and drive through heels
2024-W01,Monday,Plank,Additional,time,3,,30,60,Maintain straight line from head to heels`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );

  const renderProgressTab = () => (
    <div className="space-y-4 pb-20">
      <Card>
        <CardContent className="text-center py-8">
          <h3 className="font-semibold mb-2">Progress Tracking</h3>
          <p className="text-muted-foreground">Coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <h1 className="text-2xl font-bold text-center">FitFlow</h1>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-4">
        {activeTab === 'workouts' && renderWorkoutsTab()}
        {activeTab === 'import' && renderImportTab()}
        {activeTab === 'progress' && renderProgressTab()}
      </div>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

export default App;
