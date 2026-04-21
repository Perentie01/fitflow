import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BlockSelector } from './BlockSelector';

const mockNavigateBlock = vi.fn();

let mockCtx: {
  blocks: Array<{ id: number; block_id: string; block_name: string; is_active: number; created_at: Date }>;
  activeBlock: { id: number; block_id: string; block_name: string; is_active: number; created_at: Date } | null;
  navigateBlock: typeof mockNavigateBlock;
} = {
  blocks: [
    { id: 1, block_id: 'Week 1', block_name: 'Week 1', is_active: 1, created_at: new Date() },
    { id: 2, block_id: 'Week 2', block_name: 'Week 2', is_active: 0, created_at: new Date() },
    { id: 3, block_id: 'Week 3', block_name: 'Week 3', is_active: 0, created_at: new Date() },
  ],
  activeBlock: { id: 1, block_id: 'Week 1', block_name: 'Week 1', is_active: 1, created_at: new Date() },
  navigateBlock: mockNavigateBlock,
};

vi.mock('../context/BlockContext', () => ({
  useBlock: () => mockCtx,
}));

describe('BlockSelector', () => {
  it('renders the active block name', () => {
    render(<BlockSelector />);
    expect(screen.getByText('Week 1')).toBeInTheDocument();
  });

  it('renders dot indicators for all blocks', () => {
    const { container } = render(<BlockSelector />);
    // 3 blocks → 3 dot indicators
    const dots = container.querySelectorAll('.rounded-full');
    expect(dots).toHaveLength(3);
  });

  it('calls navigateBlock with prev when left arrow is clicked', () => {
    render(<BlockSelector />);
    const buttons = screen.getAllByRole('button');
    // First button is prev, last is next
    fireEvent.click(buttons[0]);
    expect(mockNavigateBlock).toHaveBeenCalledWith('prev');
  });

  it('calls navigateBlock with next when right arrow is clicked', () => {
    render(<BlockSelector />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[buttons.length - 1]);
    expect(mockNavigateBlock).toHaveBeenCalledWith('next');
  });

  it('renders nothing when there are no blocks', () => {
    const prev = mockCtx;
    mockCtx = { blocks: [], activeBlock: null, navigateBlock: mockNavigateBlock };
    const { container } = render(<BlockSelector />);
    expect(container.firstChild).toBeNull();
    mockCtx = prev;
  });
});
