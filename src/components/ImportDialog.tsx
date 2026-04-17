import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Copy, Check } from 'lucide-react';
import type { PendingImport, WorkoutRow } from '../lib/types';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previewData: WorkoutRow[];
  validationErrors: string[];
  pendingImport: PendingImport | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ImportDialog({
  open,
  onOpenChange,
  previewData,
  validationErrors,
  pendingImport,
  onConfirm,
  onCancel,
}: ImportDialogProps) {
  const [errorsCopied, setErrorsCopied] = useState(false);

  const copyErrors = () => {
    navigator.clipboard.writeText(validationErrors.join('\n'));
    setErrorsCopied(true);
    setTimeout(() => setErrorsCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Preview &amp; Validation</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {validationErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-red-800">⚠️ Validation Errors</h3>
                <Button
                  onClick={copyErrors}
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs border-red-300 text-red-700 hover:bg-red-100"
                >
                  {errorsCopied ? (
                    <><Check className="h-3 w-3 mr-1" />Copied</>
                  ) : (
                    <><Copy className="h-3 w-3 mr-1" />Copy errors</>
                  )}
                </Button>
              </div>
              <ul className="text-sm text-red-700 space-y-1">
                {validationErrors.slice(0, 10).map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
                {validationErrors.length > 10 && (
                  <li className="font-semibold">
                    ... and {validationErrors.length - 10} more errors
                  </li>
                )}
              </ul>
            </div>
          )}

          <div>
            <h3 className="font-semibold mb-2">Preview (First 5 Rows)</h3>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="text-left p-2">Block ID</th>
                    <th className="text-left p-2">Day</th>
                    <th className="text-left p-2">Exercise</th>
                    <th className="text-left p-2">Category</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-left p-2">Sets</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((workout, index) => (
                    <tr key={index} className="border-b border-gray-200">
                      <td className="p-2">{workout.block_id}</td>
                      <td className="p-2">{workout.day}</td>
                      <td className="p-2">{workout.exercise_name}</td>
                      <td className="p-2">{workout.category}</td>
                      <td className="p-2">{workout.type}</td>
                      <td className="p-2">{workout.sets}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-accent/50 border border-border rounded-lg p-4">
            <h3 className="font-semibold text-foreground mb-2">Import Summary</h3>
            <p className="text-sm text-muted-foreground">
              Total exercises: {pendingImport?.workoutData.length ?? 0}
              <br />
              Unique blocks: {pendingImport?.blockIds.size ?? 0}
              <br />
              Validation errors: {validationErrors.length}
            </p>
          </div>

          <div className="flex space-x-2">
            <Button onClick={onCancel} variant="outline" className="flex-1" size="sm">
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              className="flex-1"
              disabled={validationErrors.length > 0}
              variant="default"
              size="sm"
            >
              {validationErrors.length > 0 ? 'Cannot Import (Errors Found)' : 'Confirm Import'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
