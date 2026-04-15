import { useState } from 'react';
import { useToggle } from '@uidotdev/usehooks';
import { Upload, Trash2, Check, Copy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TestDataButton } from './TestDataButton';
import { ImportDialog } from './ImportDialog';
import { useBlock } from '../context/BlockContext';
import { dbHelpers } from '../lib/database';
import type { Workout } from '../lib/database';
import {
  APP_VERSION,
  AI_COPY_TEMPLATE,
  EXPORT_HEADERS,
  type PendingImport,
} from '../lib/types';
import { parseDelimited, rowToWorkout, validateWorkoutRow } from '../lib/workoutUtils';

export function ConfigTab() {
  const { activeBlock, reloadBlocks } = useBlock();
  const [isLoading, setIsLoading] = useToggle(false);
  const [showImportSuccess, setShowImportSuccess] = useToggle(false);
  const [showExportSuccess, setShowExportSuccess] = useToggle(false);
  const [showCopySuccess, setShowCopySuccess] = useToggle(false);
  const [validationDialogOpen, setValidationDialogOpen] = useToggle(false);
  const [previewData, setPreviewData] = useState<Array<Omit<Workout, 'id'>>>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const text = await file.text();
      const { headers, rows } = parseDelimited(text);
      const errors: string[] = [];
      const workoutData: Array<Omit<Workout, 'id'>> = [];
      const blockIds = new Set<string>();

      rows.forEach((values, i) => {
        const workout = rowToWorkout(headers, values);
        workoutData.push(workout);
        if (workout.block_id) blockIds.add(workout.block_id);
        errors.push(...validateWorkoutRow(workout, i + 2));
      });

      setPreviewData(workoutData.slice(0, 5));
      setValidationErrors(errors);
      setPendingImport({ workoutData, blockIds });
      setValidationDialogOpen(true);
    } catch (error) {
      console.error('Error parsing file:', error);
      alert('Error parsing file. Please check the format.');
    } finally {
      setIsLoading(false);
      event.target.value = '';
    }
  };

  const confirmImport = async () => {
    if (!pendingImport) return;

    setIsLoading(true);
    setValidationDialogOpen(false);

    try {
      await dbHelpers.clearAllData();

      const { workoutData, blockIds } = pendingImport;
      const blockIdArray = Array.from(blockIds);

      for (const blockId of blockIdArray) {
        const existing = await dbHelpers
          .getAllBlocks()
          .then((blocks) => blocks.find((b) => b.block_id === blockId));
        if (!existing) {
          await dbHelpers.createBlock({
            block_id: blockId,
            block_name: blockId,
            is_active: 0,
            created_at: new Date(),
          });
        }
      }

      await dbHelpers.importWorkouts(workoutData);
      await reloadBlocks();

      setShowImportSuccess(true);
      setTimeout(() => setShowImportSuccess(false), 2000);
    } catch (error) {
      console.error('Error importing file:', error);
      alert('Error importing file. Please check the format.');
    } finally {
      setIsLoading(false);
      setPendingImport(null);
      setPreviewData([]);
      setValidationErrors([]);
    }
  };

  const cancelImport = () => {
    setValidationDialogOpen(false);
    setPendingImport(null);
    setPreviewData([]);
    setValidationErrors([]);
  };

  const exportBlockData = async () => {
    if (!activeBlock) return;

    try {
      const { workouts, progress } = await dbHelpers.exportBlockData(activeBlock.block_id);

      const progressByWorkoutId = new Map<number, unknown[]>();
      (progress as Array<{ workout_id: number } & Record<string, unknown>>).forEach((p) => {
        const list = progressByWorkoutId.get(p.workout_id) ?? [];
        list.push(p);
        progressByWorkoutId.set(p.workout_id, list);
      });

      const tsvContent = [
        EXPORT_HEADERS.join('\t'),
        ...workouts.flatMap((workout) => {
          const rows = progressByWorkoutId.get(workout.id!) ?? [null];
          return (rows as Array<Record<string, unknown> | null>).map((p) =>
            EXPORT_HEADERS.map((header) => {
              if (header === 'completed_at') {
                return p?.completed_at ? new Date(p.completed_at as string).toISOString() : '';
              }
              if (['set_number', 'completed_reps', 'completed_weight', 'completed_duration', 'notes'].includes(header)) {
                return p ? (p[header] ?? '') : '';
              }
              return (workout as Record<string, unknown>)[header] ?? '';
            }).join('\t'),
          );
        }),
      ].join('\n');

      const blob = new Blob([tsvContent], { type: 'text/tab-separated-values' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fitflow-${activeBlock.block_id}.tsv`;
      a.click();
      URL.revokeObjectURL(url);

      setShowExportSuccess(true);
      setTimeout(() => setShowExportSuccess(false), 2000);
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  const handleClearDatabase = async () => {
    if (confirm('Are you sure you want to clear all workout data? This cannot be undone.')) {
      try {
        await dbHelpers.clearAllData();
        await reloadBlocks();
      } catch (error) {
        console.error('Error clearing database:', error);
      }
    }
  };

  return (
    <div className="space-y-4 pb-20">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Upload className="h-5 w-5" />
              <span>Import Workouts</span>
            </CardTitle>
            <span className="text-xs text-muted-foreground">{APP_VERSION}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload a TSV (recommended) or CSV file with your workout routines. Required columns:
            block_id, day, exercise_name, category, type, sets, rest, cues. Optional: reps, weight,
            duration, guidance, resistance, description.
          </p>
          <div className="space-y-2">
            <input
              type="file"
              accept=".tsv,.csv,.txt"
              onChange={handleFileImport}
              className="hidden"
              id="csv-upload"
              disabled={isLoading}
            />
            <Popover open={showImportSuccess}>
              <PopoverTrigger asChild>
                <Button
                  onClick={() => document.getElementById('csv-upload')?.click()}
                  disabled={isLoading}
                  className="w-full"
                  variant="default"
                  size="sm"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isLoading ? 'Importing...' : 'Choose TSV/CSV File'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" side="top">
                <div className="flex items-center space-x-2 text-sm">
                  <Check className="h-4 w-4 text-green-600" />
                  <span>Imported successfully</span>
                </div>
              </PopoverContent>
            </Popover>

            <TestDataButton />

            {activeBlock && (
              <Popover open={showExportSuccess}>
                <PopoverTrigger asChild>
                  <Button onClick={exportBlockData} variant="outline" className="w-full" size="sm">
                    Export Current Block
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" side="top">
                  <div className="flex items-center space-x-2 text-sm">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Exported successfully</span>
                  </div>
                </PopoverContent>
              </Popover>
            )}

            <Button
              onClick={handleClearDatabase}
              variant="destructive"
              className="w-full"
              size="sm"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All Data
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI Workout Generation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm space-y-2">
            <p className="font-medium">
              Copy instructions + example for AI tools (ChatGPT, Claude, etc.):
            </p>
            <div className="bg-muted p-3 rounded text-xs space-y-2">
              <p><strong>Required fields:</strong> block_id, day, exercise_name, category, type, sets, rest, cues</p>
              <p><strong>Optional fields:</strong> reps, weight, duration, guidance, resistance, description</p>
              <p><strong>Categories:</strong> Intent, Warm-up, Primary, Secondary, Additional, Cool-down</p>
              <p><strong>Types:</strong> weights, time, mindset</p>
              <p><strong>Intent exercises:</strong> Use category=Intent, type=mindset for mental prep</p>
              <p><strong>Guidance:</strong> Instructions like "70% 1RM" or "per side"</p>
              <p><strong>Resistance:</strong> For non-weight exercises like "Red band"</p>
              <p><strong>Description:</strong> Detailed exercise setup and execution</p>
            </div>
          </div>
          <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
            {`block_id\tday\texercise_name\tcategory\ttype\tsets\treps\tweight\tduration\trest\tcues\tguidance\tresistance\tdescription
Week 1\tDay 1\tFocus\tIntent\tmindset\t1\t\t\t2\t0\tToday's goal: build power, focus on explosive movement
Week 1\tDay 1\tSquats\tPrimary\tweights\t3\t10\t100\t\t90\tKeep chest up, drive through heels\t70% 1RM\t\tStand with feet shoulder-width apart, toes slightly out. Lower until thighs parallel to ground, keeping chest up. Drive through heels to return to standing.
Week 1\tDay 1\tBand Pull\tAdditional\tweights\t3\t15\t\t\t60\tControl the movement, squeeze at the top\t\tRed band\t`}
          </pre>
          <Popover open={showCopySuccess}>
            <PopoverTrigger asChild>
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(AI_COPY_TEMPLATE);
                  setShowCopySuccess(true);
                  setTimeout(() => setShowCopySuccess(false), 2000);
                }}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy for AI Generation
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" side="top">
              <div className="flex items-center space-x-2 text-sm">
                <Check className="h-4 w-4 text-green-600" />
                <span>Copied to clipboard!</span>
              </div>
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      <ImportDialog
        open={validationDialogOpen}
        onOpenChange={setValidationDialogOpen}
        previewData={previewData}
        validationErrors={validationErrors}
        pendingImport={pendingImport}
        onConfirm={confirmImport}
        onCancel={cancelImport}
      />
    </div>
  );
}
