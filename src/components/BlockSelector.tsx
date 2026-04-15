import { useToggle } from '@uidotdev/usehooks';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useBlock } from '../context/BlockContext';

export function BlockSelector() {
  const { blocks, activeBlock, selectBlock, navigateBlock } = useBlock();
  const [open, setOpen] = useToggle(false);

  if (!activeBlock || blocks.length === 0) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 md:px-1">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button className="text-lg font-bold hover:text-blue-600 transition-colors">
            {activeBlock.block_name}
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Select Block</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto space-y-2">
            {blocks.map((block) => (
              <Button
                key={block.block_id}
                variant={activeBlock.block_id === block.block_id ? 'default' : 'outline'}
                className="w-full justify-start"
                size="sm"
                onClick={() => {
                  selectBlock(block);
                  setOpen(false);
                }}
              >
                <div className="text-left">
                  <div className="font-semibold">{block.block_name}</div>
                  <div className="text-xs opacity-70">{block.block_id}</div>
                </div>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex gap-1">
        <Button variant="ghost" size="sm" onClick={() => navigateBlock('prev')}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => navigateBlock('next')}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
