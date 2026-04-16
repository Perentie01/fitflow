import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImportDialog } from './ImportDialog';
import type { Workout } from '../lib/database';

const mockPreviewData: Array<Omit<Workout, 'id'>> = [
  {
    block_id: 'Week 1',
    day: 'Day 1',
    exercise_name: 'Squats',
    category: 'Primary',
    type: 'weights',
    sets: 3,
    reps: 10,
    weight: 100,
    rest: 90,
    cues: 'Drive through heels',
  },
  {
    block_id: 'Week 1',
    day: 'Day 1',
    exercise_name: 'Bench Press',
    category: 'Primary',
    type: 'weights',
    sets: 3,
    reps: 8,
    weight: 60,
    rest: 90,
    cues: 'Arch back slightly',
  },
];

const mockPendingImport = {
  workoutData: mockPreviewData,
  blockIds: new Set(['Week 1']),
};

describe('ImportDialog', () => {
  it('renders preview table with workout data when open', () => {
    render(
      <ImportDialog
        open={true}
        onOpenChange={() => {}}
        previewData={mockPreviewData}
        validationErrors={[]}
        pendingImport={mockPendingImport}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );

    expect(screen.getByText('Import Preview & Validation')).toBeInTheDocument();
    expect(screen.getByText('Squats')).toBeInTheDocument();
    expect(screen.getByText('Bench Press')).toBeInTheDocument();
  });

  it('shows validation errors and disables confirm button', () => {
    const errors = ['Row 1: Missing block_id', 'Row 2: Missing day'];
    render(
      <ImportDialog
        open={true}
        onOpenChange={() => {}}
        previewData={mockPreviewData}
        validationErrors={errors}
        pendingImport={mockPendingImport}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );

    expect(screen.getByText('• Row 1: Missing block_id')).toBeInTheDocument();
    expect(screen.getByText('• Row 2: Missing day')).toBeInTheDocument();
    expect(screen.getByText('Cannot Import (Errors Found)')).toBeDisabled();
  });

  it('shows import summary with correct counts', () => {
    render(
      <ImportDialog
        open={true}
        onOpenChange={() => {}}
        previewData={mockPreviewData}
        validationErrors={[]}
        pendingImport={mockPendingImport}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );

    // The summary text is in a single <p> with <br/> elements
    const summaryText = screen.getByText(/Total exercises:/);
    expect(summaryText).toHaveTextContent('Total exercises: 2');
    expect(summaryText).toHaveTextContent('Unique blocks: 1');
    expect(summaryText).toHaveTextContent('Validation errors: 0');
  });

  it('calls onConfirm when Confirm Import is clicked', () => {
    const onConfirm = vi.fn();
    render(
      <ImportDialog
        open={true}
        onOpenChange={() => {}}
        previewData={mockPreviewData}
        validationErrors={[]}
        pendingImport={mockPendingImport}
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    );

    fireEvent.click(screen.getByText('Confirm Import'));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('calls onCancel when Cancel is clicked', () => {
    const onCancel = vi.fn();
    render(
      <ImportDialog
        open={true}
        onOpenChange={() => {}}
        previewData={mockPreviewData}
        validationErrors={[]}
        pendingImport={mockPendingImport}
        onConfirm={() => {}}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
