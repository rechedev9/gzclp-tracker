import { describe, it, expect } from 'bun:test';
import { render } from '@testing-library/react';
import { ToastContainer } from './toast';
import { ToastProvider, useToast } from '@/contexts/toast-context';
import { useEffect } from 'react';

// ---------------------------------------------------------------------------
// Toast — hero-number-glow class assertions (REQ-TOAST-001, REQ-TOAST-002)
// ---------------------------------------------------------------------------

/**
 * Helper: renders a ToastProvider + ToastContainer and fires a toast
 * with the given variant via a child component.
 */
function ToastTrigger({
  message,
  variant,
}: {
  readonly message: string;
  readonly variant?: 'pr' | 'default';
}): null {
  const { toast } = useToast();
  useEffect(() => {
    toast({ message, variant });
  }, []);
  return null;
}

function renderWithToast(message: string, variant?: 'pr' | 'default'): ReturnType<typeof render> {
  return render(
    <ToastProvider>
      <ToastTrigger message={message} variant={variant} />
      <ToastContainer />
    </ToastProvider>
  );
}

describe('ToastContainer', () => {
  describe('PR variant glow class (REQ-TOAST-001, REQ-TOAST-002)', () => {
    it('should add hero-number-glow class to PR toast text span', () => {
      renderWithToast('Sentadilla 60 kg', 'pr');

      const span = document.querySelector('.hero-number-glow');

      expect(span).not.toBeNull();
    });

    it('should NOT add hero-number-glow to standard (default) toast text span', () => {
      renderWithToast('Éxito en T1', 'default');

      const span = document.querySelector('.hero-number-glow');

      expect(span).toBeNull();
    });

    it('should NOT add hero-number-glow to toast without explicit variant (defaults to default)', () => {
      renderWithToast('Simple message');

      const span = document.querySelector('.hero-number-glow');

      expect(span).toBeNull();
    });

    it('should display PR message text with NEW PR prefix', () => {
      renderWithToast('Sentadilla 60 kg', 'pr');

      const span = document.querySelector('.hero-number-glow');

      expect(span?.textContent).toContain('NEW PR');
      expect(span?.textContent).toContain('Sentadilla 60 kg');
    });
  });
});
