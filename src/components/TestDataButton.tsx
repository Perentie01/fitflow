import React from 'react';
import { Button } from '@/components/ui/button';
import { dbHelpers } from '../lib/database';

export function TestDataButton() {
  const loadTestData = async () => {
    try {
      console.log('Loading Ultimate Frisbee test data...');
      // Fetch the Ultimate Frisbee preseason workout TSV file
      const response = await fetch('/fitflow/ultimate_frisbee_preseason.tsv');
      console.log('Fetch response status:', response.status);
      const tsvText = await response.text();
      
      // Parse TSV file
      const lines = tsvText.trim().split('\n');
      const headers = lines[0].split('\t');
      
      // Track unique blocks to create
      const blocksToCreate = new Set<string>();
      const workouts: any[] = [];
      
      // Parse each line (skip header)
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split('\t');
        if (values.length < headers.length) continue; // Skip incomplete lines
        
        const workout: any = {};
        headers.forEach((header, index) => {
          const value = values[index]?.trim();
          workout[header] = value || undefined;
        });
        
        // Track blocks
        if (workout.block_id) {
          blocksToCreate.add(workout.block_id);
        }
        
        // Convert to proper types
        const processedWorkout = {
          block_id: workout.block_id,
          day: workout.day,
          exercise_name: workout.exercise_name,
          category: workout.category as 'Warm-up' | 'Primary' | 'Secondary' | 'Additional' | 'Cool-down' | 'Intent',
          type: workout.type as 'weights' | 'time' | 'mindset',
          sets: parseInt(workout.sets) || 1,
          reps: workout.reps ? parseInt(workout.reps) : undefined,
          weight: workout.weight && workout.weight !== 'Bodyweight' && !isNaN(parseFloat(workout.weight)) 
            ? parseFloat(workout.weight) 
            : undefined,
          duration: workout.duration ? parseFloat(workout.duration) : undefined,
          rest: parseInt(workout.rest) || 0,
          cues: workout.cues || '',
          guidance: workout.guidance || undefined,
          resistance: workout.resistance || undefined,
          description: workout.description || undefined
        };
        
        workouts.push(processedWorkout);
      }
      
      // Create blocks (first one active, rest inactive)
      const blockArray = Array.from(blocksToCreate);
      for (let i = 0; i < blockArray.length; i++) {
        await dbHelpers.createBlock({
          block_id: blockArray[i],
          block_name: blockArray[i],
          is_active: i === 0 ? 1 : 0,
          created_at: new Date()
        });
      }
      
      // Import workouts
      console.log('Importing', workouts.length, 'workouts from', blockArray.length, 'blocks');
      console.log('First workout:', workouts[0]);
      await dbHelpers.importWorkouts(workouts);
      console.log('Import complete!');
      
      // Reload the page to show the new data
      window.location.reload();
    } catch (error) {
      console.error('Error loading test data:', error);
      alert('Error loading test data. Check console for details.');
    }
  };

  return (
    <Button onClick={loadTestData} variant="outline" className="w-full">
      Load Test Data
    </Button>
  );
}

