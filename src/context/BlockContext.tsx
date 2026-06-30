import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Block, dbHelpers } from '../lib/database';
import { useAuth } from './AuthContext';
import { saveSnapshot } from '../lib/sync';

interface BlockContextValue {
  blocks: Block[];
  activeBlock: Block | null;
  selectBlock: (block: Block) => void;
  navigateBlock: (direction: 'prev' | 'next') => void;
  reloadBlocks: () => Promise<void>;
  createBlock: (name: string) => Promise<void>;
}

const BlockContext = createContext<BlockContextValue | null>(null);

export function BlockProvider({ children }: { children: ReactNode }) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [activeBlock, setActiveBlock] = useState<Block | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    reloadBlocks().catch(console.error);
  }, []);

  const reloadBlocks = async () => {
    const allBlocks = await dbHelpers.getAllBlocks();
    const validBlocks = allBlocks.sort((a, b) => a.block_name.localeCompare(b.block_name));

    setBlocks(validBlocks);

    if (validBlocks.length === 0) {
      setActiveBlock(null);
      return;
    }

    const active = await dbHelpers.getActiveBlock();
    const activeIsValid = active && validBlocks.some((b) => b.block_id === active.block_id);

    if (activeIsValid) {
      setActiveBlock(active);
    } else {
      setActiveBlock(validBlocks[0]);
      await dbHelpers.setActiveBlock(validBlocks[0].block_id);
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

  const createBlock = async (name: string) => {
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const block_id = `${slug}-${Date.now()}`;
    await dbHelpers.createBlock({ block_id, block_name: name, is_active: 0, created_at: new Date() });
    await dbHelpers.setActiveBlock(block_id);
    await reloadBlocks();
    if (user) await saveSnapshot(user.id);
  };

  return (
    <BlockContext.Provider value={{ blocks, activeBlock, selectBlock, navigateBlock, reloadBlocks, createBlock }}>
      {children}
    </BlockContext.Provider>
  );
}

export function useBlock() {
  const ctx = useContext(BlockContext);
  if (!ctx) throw new Error('useBlock must be used within BlockProvider');
  return ctx;
}
