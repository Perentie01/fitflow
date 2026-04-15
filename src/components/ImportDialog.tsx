import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { PendingImport } from '../lib/types';
import type { Workout } from '../lib/database';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previewData: Array<Omit<Workout, 'id'>>;
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Preview &amp; Validation</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {validationErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-red-800 mb-2">⚠️ Validation Errors</h3>
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

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">Import Summary</h3>
            <p className="text-sm text-blue-700">
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
