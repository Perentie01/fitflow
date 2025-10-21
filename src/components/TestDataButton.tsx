import React from 'react';
import { Button } from '@/components/ui/button';
import { dbHelpers } from '../lib/database';

export function TestDataButton() {
  const loadTestData = async () => {
    try {
      // Create test blocks
      await dbHelpers.createBlock({
        block_id: 'Week 1',
        block_name: 'Week 1',
        is_active: 1,
        created_at: new Date()
      });

      await dbHelpers.createBlock({
        block_id: 'Week 2',
        block_name: 'Week 2',
        is_active: 0,
        created_at: new Date()
      });

      // Create test workouts with cues
      const testWorkouts = [
        {
          block_id: 'Week 1',
          day: 'Day 1',
          exercise_name: 'Dynamic Warm-up',
          category: 'Warm-up' as const,
          type: 'time' as const,
          sets: 1,
          duration: 5,
          rest: 60,
          cues: 'Light movement to prepare joints and muscles'
        },
        {
          block_id: 'Week 1',
          day: 'Day 1',
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
          block_id: 'Week 1',
          day: 'Day 1',
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
          block_id: 'Week 1',
          day: 'Day 1',
          exercise_name: 'Plank',
          category: 'Additional' as const,
          type: 'time' as const,
          sets: 3,
          duration: 2,
          rest: 60,
          cues: 'Maintain straight line from head to heels'
        },
        {
          block_id: 'Week 1',
          day: 'Day 1',
          exercise_name: 'Cool-down Stretch',
          category: 'Cool-down' as const,
          type: 'time' as const,
          sets: 1,
          duration: 10,
          rest: 0,
          cues: 'Hold each stretch for 30 seconds'
        },
        {
          block_id: 'Week 1',
          day: 'Day 2',
          exercise_name: 'Light Cardio',
          category: 'Warm-up' as const,
          type: 'time' as const,
          sets: 1,
          duration: 10,
          rest: 60,
          cues: 'Easy pace to get blood flowing'
        },
        {
          block_id: 'Week 1',
          day: 'Day 2',
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
          block_id: 'Week 1',
          day: 'Day 2',
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

