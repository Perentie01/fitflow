import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useBlock } from '../context/BlockContext';

export const BlockSelector = () => {
  const { blocks, activeBlock, navigateBlock, createBlock } = useBlock();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  const activeIndex = activeBlock
    ? blocks.findIndex((b) => b.block_id === activeBlock.block_id)
    : -1;

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      await createBlock(name.trim());
      setOpen(false);
      setName('');
    } finally {
      setCreating(false);
    }
  };

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) setName('');
  };

  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 md:px-1">
        {activeBlock ? (
          <>
            <Button
              className=""
              variant="ghost"
              size="sm"
              onClick={() => navigateBlock('prev')}
              disabled={blocks.length <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex flex-col items-center gap-1.5">
              <span className="text-lg font-bold text-foreground">{activeBlock.block_name}</span>
              {blocks.length > 1 && (
                <div className="flex gap-1.5">
                  {blocks.map((block, i) => (
                    <span
                      key={block.block_id}
                      className={`h-1.5 rounded-full transition-all ${
                        i === activeIndex ? 'w-4 bg-primary' : 'w-1.5 bg-muted-foreground/30'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center">
              <Button
                className=""
                variant="ghost"
                size="sm"
                onClick={() => navigateBlock('next')}
                disabled={blocks.length <= 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                className=""
                variant="ghost"
                size="sm"
                onClick={() => setOpen(true)}
                aria-label="New block"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <div className="flex w-full justify-center">
            <Button
              className=""
              variant="ghost"
              size="sm"
              onClick={() => setOpen(true)}
              aria-label="New block"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              New Block
            </Button>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader className="">
            <DialogTitle className="">New Block</DialogTitle>
          </DialogHeader>
          <Input
            className=""
            type="text"
            placeholder="e.g. Phase 2 — Strength"
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === 'Enter') handleCreate();
            }}
            autoFocus
          />
          <DialogFooter className="">
            <Button
              className=""
              variant="outline"
              size="sm"
              onClick={() => { setOpen(false); setName(''); }}
            >
              Cancel
            </Button>
            <Button
              className=""
              variant="default"
              size="sm"
              onClick={handleCreate}
              disabled={!name.trim() || creating}
            >
              {creating ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
