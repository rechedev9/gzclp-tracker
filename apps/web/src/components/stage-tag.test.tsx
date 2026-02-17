import { describe, it, expect } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { StageTag } from './stage-tag';

// ---------------------------------------------------------------------------
// StageTag — render contract tests
// ---------------------------------------------------------------------------
describe('StageTag', () => {
  it('should display S1 for stage 0', () => {
    render(<StageTag stage={0} />);

    expect(screen.getByText('S1')).toBeInTheDocument();
  });

  it('should display S2 for stage 1', () => {
    render(<StageTag stage={1} />);

    expect(screen.getByText('S2')).toBeInTheDocument();
  });

  it('should display S3 for stage 2', () => {
    render(<StageTag stage={2} />);

    expect(screen.getByText('S3')).toBeInTheDocument();
  });

  it('should include stage label in title attribute', () => {
    render(<StageTag stage={0} />);

    const tag = screen.getByText('S1');
    expect(tag).toHaveAttribute('title', 'Stage 1: Normal');
  });

  it('should show "Caution" label for stage 1', () => {
    render(<StageTag stage={1} />);

    const tag = screen.getByText('S2');
    expect(tag).toHaveAttribute('title', 'Stage 2: Caution');
  });

  it('should show "Reset next fail" label for stage 2', () => {
    render(<StageTag stage={2} />);

    const tag = screen.getByText('S3');
    expect(tag).toHaveAttribute('title', 'Stage 3: Reset next fail');
  });

  it('should clamp stages above 2 to stage 2', () => {
    render(<StageTag stage={5} />);

    // Displays S6 (stage + 1) but uses styles/label for stage 2
    const tag = screen.getByText('S6');
    expect(tag).toHaveAttribute('title', 'Stage 6: Reset next fail');
  });
});
