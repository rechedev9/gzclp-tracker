import { describe, it, expect, mock } from 'bun:test';
import { render, screen, fireEvent } from '@testing-library/react';
import { SetupForm } from './setup-form';
import type { StartWeights } from '@gzclp/shared/types';
import { DEFAULT_WEIGHTS } from '../../test/helpers/fixtures';

// ---------------------------------------------------------------------------
// SetupForm — behavioral integration tests
// ---------------------------------------------------------------------------
describe('SetupForm', () => {
  describe('initial render (new program)', () => {
    it('should show all 6 exercise fields with default values', () => {
      const onGenerate = mock();
      render(<SetupForm onGenerate={onGenerate} />);

      expect(screen.getByLabelText('Squat (T1)')).toHaveValue(60);
      expect(screen.getByLabelText('Bench Press (T1)')).toHaveValue(40);
      expect(screen.getByLabelText('Deadlift (T1)')).toHaveValue(60);
      expect(screen.getByLabelText('OHP (T1)')).toHaveValue(30);
      expect(screen.getByLabelText('Lat Pulldown (T3)')).toHaveValue(30);
      expect(screen.getByLabelText('DB Bent Over Row (T3)')).toHaveValue(12.5);
    });

    it('should show "Generate Program" button', () => {
      render(<SetupForm onGenerate={mock()} />);

      expect(screen.getByText('Generate Program')).toBeInTheDocument();
    });

    it('should not show Cancel button in new program mode', () => {
      render(<SetupForm onGenerate={mock()} />);

      expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
    });
  });

  describe('submit', () => {
    it('should call onGenerate with parsed weights on submit', () => {
      const onGenerate = mock();
      render(<SetupForm onGenerate={onGenerate} />);

      fireEvent.click(screen.getByText('Generate Program'));

      expect(onGenerate).toHaveBeenCalledTimes(1);
      const weights = onGenerate.mock.calls[0][0] as StartWeights;
      expect(weights.squat).toBe(60);
      expect(weights.bench).toBe(40);
      expect(weights.deadlift).toBe(60);
      expect(weights.ohp).toBe(30);
    });
  });

  describe('validation', () => {
    it('should show error when a field is empty', () => {
      render(<SetupForm onGenerate={mock()} />);

      const squatInput = screen.getByLabelText('Squat (T1)');
      fireEvent.change(squatInput, { target: { value: '' } });
      fireEvent.blur(squatInput);

      expect(screen.getByText('Required')).toBeInTheDocument();
    });

    it('should show error when weight is below minimum', () => {
      render(<SetupForm onGenerate={mock()} />);

      const squatInput = screen.getByLabelText('Squat (T1)');
      fireEvent.change(squatInput, { target: { value: '1' } });
      fireEvent.blur(squatInput);

      // The error is shown in a role="alert" element with id="squat-error"
      const errorEl = document.getElementById('squat-error');
      expect(errorEl).not.toBeNull();
      expect(errorEl!.textContent).toContain('Min 2.5 kg');
    });

    it('should show error when weight exceeds maximum', () => {
      render(<SetupForm onGenerate={mock()} />);

      const squatInput = screen.getByLabelText('Squat (T1)');
      fireEvent.change(squatInput, { target: { value: '501' } });
      fireEvent.blur(squatInput);

      expect(screen.getByText('Max 500 kg')).toBeInTheDocument();
    });

    it('should not call onGenerate when validation fails', () => {
      const onGenerate = mock();
      render(<SetupForm onGenerate={onGenerate} />);

      const squatInput = screen.getByLabelText('Squat (T1)');
      fireEvent.change(squatInput, { target: { value: '' } });
      fireEvent.click(screen.getByText('Generate Program'));

      expect(onGenerate).not.toHaveBeenCalled();
    });

    it('should show summary error message when submit fails validation', () => {
      render(<SetupForm onGenerate={mock()} />);

      const squatInput = screen.getByLabelText('Squat (T1)');
      fireEvent.change(squatInput, { target: { value: '' } });
      fireEvent.click(screen.getByText('Generate Program'));

      expect(screen.getByText('Please fix the following:')).toBeInTheDocument();
    });
  });

  describe('+/- weight adjustment', () => {
    it('should increase weight when + button is clicked', () => {
      render(<SetupForm onGenerate={mock()} />);

      const increaseBtn = screen.getByLabelText('Increase Squat (T1)');
      fireEvent.click(increaseBtn);

      expect(screen.getByLabelText('Squat (T1)')).toHaveValue(60.5);
    });

    it('should decrease weight when - button is clicked', () => {
      render(<SetupForm onGenerate={mock()} />);

      const decreaseBtn = screen.getByLabelText('Decrease Squat (T1)');
      fireEvent.click(decreaseBtn);

      expect(screen.getByLabelText('Squat (T1)')).toHaveValue(59.5);
    });
  });

  describe('edit mode', () => {
    it('should show collapsed summary with current weights', () => {
      render(
        <SetupForm initialWeights={DEFAULT_WEIGHTS} onGenerate={mock()} onUpdateWeights={mock()} />
      );

      expect(screen.getByText('Starting Weights')).toBeInTheDocument();
      expect(screen.getByText('Edit Weights')).toBeInTheDocument();
    });

    it('should expand form when Edit Weights is clicked', () => {
      render(
        <SetupForm initialWeights={DEFAULT_WEIGHTS} onGenerate={mock()} onUpdateWeights={mock()} />
      );

      fireEvent.click(screen.getByText('Edit Weights'));

      expect(screen.getByText('Edit Starting Weights (kg)')).toBeInTheDocument();
      expect(screen.getByText('Update Weights')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should show confirmation dialog before updating weights', () => {
      render(
        <SetupForm initialWeights={DEFAULT_WEIGHTS} onGenerate={mock()} onUpdateWeights={mock()} />
      );

      fireEvent.click(screen.getByText('Edit Weights'));
      fireEvent.click(screen.getByText('Update Weights'));

      expect(screen.getByText('Update Starting Weights')).toBeInTheDocument();
    });

    it('should collapse back when Cancel is clicked', () => {
      render(
        <SetupForm initialWeights={DEFAULT_WEIGHTS} onGenerate={mock()} onUpdateWeights={mock()} />
      );

      fireEvent.click(screen.getByText('Edit Weights'));
      fireEvent.click(screen.getByText('Cancel'));

      expect(screen.getByText('Edit Weights')).toBeInTheDocument();
      expect(screen.queryByText('Update Weights')).not.toBeInTheDocument();
    });
  });
});
