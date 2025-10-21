import React from 'react';
import { Button } from '@/components/ui/button';
import { dbHelpers } from '../lib/database';

export function TestDataButton() {
  const loadTestData = async () => {
    try {
      // Create test weeks
      await dbHelpers.createWeek({
        week_id: '2024-W01',
        week_number: 1,
        year: 2024,
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-07'),
        is_active: 1
      });

      await dbHelpers.createWeek({
        week_id: '2024-W02',
        week_number: 2,
        year: 2024,
        start_date: new Date('2024-01-08'),
        end_date: new Date('2024-01-14'),
        is_active: 0
      });

      // Create test workouts with cues
      const testWorkouts = [
        {
          week_id: '2024-W01',
          day: 'Monday',
          exercise_name: 'Dynamic Warm-up',
          category: 'Warm-up' as const,
          type: 'time' as const,
          sets: 1,
          duration: 5,
          rest: 60,
          cues: 'Light movement to prepare joints and muscles'
        },
        {
          week_id: '2024-W01',
          day: 'Monday',
          exercise_name: 'Squats',
          category: 'Primary' as const,
          type: 'weights' as const,
          sets: 3,
          reps: 10,
          weight: 100,
          rest: 90,
          cues: 'Keep chest up and drive through heels'
        },
        {
          week_id: '2024-W01',
          day: 'Monday',
          exercise_name: 'Bench Press',
          category: 'Primary' as const,
          type: 'weights' as const,
          sets: 3,
          reps: 8,
          weight: 80,
          rest: 90,
          cues: 'Control the descent and pause at chest'
        },
        {
          week_id: '2024-W01',
          day: 'Monday',
          exercise_name: 'Plank',
          category: 'Additional' as const,
          type: 'time' as const,
          sets: 3,
          duration: 2,
          rest: 60,
          cues: 'Maintain straight line from head to heels'
        },
        {
          week_id: '2024-W01',
          day: 'Monday',
          exercise_name: 'Cool-down Stretch',
          category: 'Cool-down' as const,
          type: 'time' as const,
          sets: 1,
          duration: 10,
          rest: 0,
          cues: 'Hold each stretch for 30 seconds'
        },
        {
          week_id: '2024-W01',
          day: 'Tuesday',
          exercise_name: 'Light Cardio',
          category: 'Warm-up' as const,
          type: 'time' as const,
          sets: 1,
          duration: 10,
          rest: 60,
          cues: 'Easy pace to get blood flowing'
        },
        {
          week_id: '2024-W01',
          day: 'Tuesday',
          exercise_name: 'Deadlifts',
          category: 'Primary' as const,
          type: 'weights' as const,
          sets: 3,
          reps: 5,
          weight: 120,
          rest: 120,
          cues: 'Maintain neutral spine and engage lats'
        },
        {
          week_id: '2024-W01',
          day: 'Tuesday',
          exercise_name: 'Pull-ups',
          category: 'Secondary' as const,
          type: 'weights' as const,
          sets: 3,
          reps: 8,
          rest: 90,
          cues: 'Pull chest to bar and control descent'
        }
      ];

      await dbHelpers.importWorkouts(testWorkouts);
      
      // Reload the page to show the new data
      window.location.reload();
    } catch (error) {
      console.error('Error loading test data:', error);
    }
  };

  return (
    <Button onClick={loadTestData} variant="outline" className="w-full">
      Load Test Data
    </Button>
  );
}

