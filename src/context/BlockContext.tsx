import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Block, dbHelpers, initializeDefaultBlock } from '../lib/database';

interface BlockContextValue {
  blocks: Block[];
  activeBlock: Block | null;
  selectBlock: (block: Block) => void;
  navigateBlock: (direction: 'prev' | 'next') => void;
  reloadBlocks: () => Promise<void>;
}

const BlockContext = createContext<BlockContextValue | null>(null);

export function BlockProvider({ children }: { children: ReactNode }) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [activeBlock, setActiveBlock] = useState<Block | null>(null);

  useEffect(() => {
    initializeDefaultBlock().then(() => reloadBlocks()).catch(console.error);
  }, []);

  const reloadBlocks = async () => {
    const allBlocks = await dbHelpers.getAllBlocks();

    const blocksWithWorkouts = await Promise.all(
      allBlocks.map(async (block) => {
        const workouts = await dbHelpers.getWorkoutsByBlock(block.block_id);
        return workouts.length > 0 ? block : null;
      }),
    );

    const validBlocks = blocksWithWorkouts
      .filter((b): b is Block => b !== null)
      .sort((a, b) => a.block_name.localeCompare(b.block_name));

    setBlocks(validBlocks);

    const active = await dbHelpers.getActiveBlock();
    if (active) {
      setActiveBlock(active);
    } else if (allBlocks.length > 0) {
      setActiveBlock(allBlocks[0]);
      await dbHelpers.setActiveBlock(allBlocks[0].block_id);
    } else {
      setActiveBlock(null);
    }
  };

  const selectBlock = (block: Block) => {
    setActiveBlock(block);
    dbHelpers.setActiveBlock(block.block_id);
  };

  const navigateBlock = (direction: 'prev' | 'next') => {
    if (!activeBlock || blocks.length === 0) return;
    const currentIndex = blocks.findIndex((b) => b.block_id === activeBlock.block_id);
    const newIndex =
      direction === 'prev'
        ? currentIndex > 0 ? currentIndex - 1 : blocks.length - 1
        : currentIndex < blocks.length - 1 ? currentIndex + 1 : 0;
    selectBlock(blocks[newIndex]);
  };

  return (
    <BlockContext.Provider value={{ blocks, activeBlock, selectBlock, navigateBlock, reloadBlocks }}>
      {children}
    </BlockContext.Provider>
  );
}

export function useBlock() {
  const ctx = useContext(BlockContext);
  if (!ctx) throw new Error('useBlock must be used within BlockProvider');
  return ctx;
}
