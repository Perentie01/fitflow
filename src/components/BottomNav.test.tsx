import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BottomNav } from './BottomNav';

describe('BottomNav', () => {
  it('renders all three tabs', () => {
    render(<BottomNav activeTab="workouts" onTabChange={() => {}} />);
    expect(screen.getByText('Progress')).toBeInTheDocument();
    expect(screen.getByText('Workouts')).toBeInTheDocument();
    expect(screen.getByText('Config')).toBeInTheDocument();
  });

  it('calls onTabChange with correct tab id when clicked', () => {
    const onTabChange = vi.fn();
    render(<BottomNav activeTab="workouts" onTabChange={onTabChange} />);

    fireEvent.click(screen.getByText('Config'));
    expect(onTabChange).toHaveBeenCalledWith('config');

    fireEvent.click(screen.getByText('Progress'));
    expect(onTabChange).toHaveBeenCalledWith('progress');
  });

  it('highlights the active tab with primary text color', () => {
    render(<BottomNav activeTab="config" onTabChange={() => {}} />);
    const configButton = screen.getByText('Config').closest('button')!;
    expect(configButton.className).toContain('text-primary');
  });
});
