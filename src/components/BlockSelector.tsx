import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBlock } from '../context/BlockContext';

export function BlockSelector() {
  const { blocks, activeBlock, navigateBlock } = useBlock();

  if (!activeBlock || blocks.length === 0) return null;

  const activeIndex = blocks.findIndex((b) => b.block_id === activeBlock.block_id);

  return (
    <div className="flex items-center justify-between px-4 py-3 md:px-1">
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
        <span className="text-lg font-bold text-foreground">
          {activeBlock.block_name}
        </span>
        {blocks.length > 1 && (
          <div className="flex gap-1.5">
            {blocks.map((block, i) => (
              <span
                key={block.block_id}
                className={`h-1.5 rounded-full transition-all ${
                  i === activeIndex
                    ? 'w-4 bg-primary'
                    : 'w-1.5 bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <Button
        className=""
        variant="ghost"
        size="sm"
        onClick={() => navigateBlock('next')}
        disabled={blocks.length <= 1}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
