import { Button } from '@/components/ui/button';
import { dbHelpers } from '../lib/database';
import { parseDelimited, rowToWorkout } from '../lib/workoutUtils';
import { useBlock } from '../context/BlockContext';

export function TestDataButton() {
  const { reloadBlocks } = useBlock();

  const loadTestData = async () => {
    try {
      const response = await fetch('/fitflow/ultimate_frisbee_preseason.tsv');
      const tsvText = await response.text();
      const { headers, rows } = parseDelimited(tsvText);

      const blocksToCreate = new Set<string>();
      const workouts = rows.map((values) => {
        const workout = rowToWorkout(headers, values);
        if (workout.block_id) blocksToCreate.add(workout.block_id);
        return workout;
      });

      const blockArray = Array.from(blocksToCreate);
      for (let i = 0; i < blockArray.length; i++) {
        await dbHelpers.createBlock({
          block_id: blockArray[i],
          block_name: blockArray[i],
          is_active: i === 0 ? 1 : 0,
          created_at: new Date(),
        });
      }

      await dbHelpers.importWorkouts(workouts);
      await reloadBlocks();
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
