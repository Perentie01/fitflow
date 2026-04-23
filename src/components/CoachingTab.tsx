import { useState } from 'react';
import { MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfigTab } from './ConfigTab';

export function CoachingTab() {
  const [configOpen, setConfigOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Coaching</h1>
        <div className="flex items-center gap-2">
          {/* <ModelSelector /> — wired in Phase 3 (Block E) */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setConfigOpen(true)}
            aria-label="Open settings"
          >
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* ChatThread + ProgramChangesPreview slots — wired in Phase 3 */}

      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>
          <ConfigTab />
        </DialogContent>
      </Dialog>
    </div>
  );
}
