import { describe, it, expect, mock } from 'bun:test';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmDialog } from './confirm-dialog';

// ---------------------------------------------------------------------------
// ConfirmDialog — behavioral integration tests
// ---------------------------------------------------------------------------
describe('ConfirmDialog', () => {
  const baseProps = {
    open: true,
    title: 'Test Title',
    message: 'Test message body',
    onConfirm: mock(),
    onCancel: mock(),
  };

  describe('rendering', () => {
    it('should render title and message when open', () => {
      render(<ConfirmDialog {...baseProps} />);

      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('Test message body')).toBeInTheDocument();
    });

    it('should render nothing when closed', () => {
      const { container } = render(<ConfirmDialog {...baseProps} open={false} />);

      expect(container.innerHTML).toBe('');
    });

    it('should use default button labels', () => {
      render(<ConfirmDialog {...baseProps} />);

      expect(screen.getByText('Confirmar')).toBeInTheDocument();
      expect(screen.getByText('Cancelar')).toBeInTheDocument();
    });

    it('should use custom button labels', () => {
      render(<ConfirmDialog {...baseProps} confirmLabel="Delete Forever" cancelLabel="Keep It" />);

      expect(screen.getByText('Delete Forever')).toBeInTheDocument();
      expect(screen.getByText('Keep It')).toBeInTheDocument();
    });
  });

  describe('callbacks', () => {
    it('should call onConfirm when confirm button is clicked', () => {
      const onConfirm = mock();
      render(<ConfirmDialog {...baseProps} onConfirm={onConfirm} />);

      fireEvent.click(screen.getByText('Confirmar'));

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('should call onCancel when cancel button is clicked', () => {
      const onCancel = mock();
      render(<ConfirmDialog {...baseProps} onCancel={onCancel} />);

      fireEvent.click(screen.getByText('Cancelar'));

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('should call onCancel when backdrop is clicked', () => {
      const onCancel = mock();
      render(<ConfirmDialog {...baseProps} onCancel={onCancel} />);

      // The backdrop is the outermost div with the fixed class
      const backdrop = screen.getByText('Test Title').closest('.fixed');
      expect(backdrop).not.toBeNull();
      fireEvent.click(backdrop!);

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('should not call onCancel when dialog content is clicked', () => {
      const onCancel = mock();
      render(<ConfirmDialog {...baseProps} onCancel={onCancel} />);

      // Click on the message text (inside the dialog content)
      fireEvent.click(screen.getByText('Test message body'));

      expect(onCancel).not.toHaveBeenCalled();
    });

    it('should call onCancel when Escape key is pressed', () => {
      const onCancel = mock();
      render(<ConfirmDialog {...baseProps} onCancel={onCancel} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('should not respond to Escape when closed', () => {
      const onCancel = mock();
      render(<ConfirmDialog {...baseProps} open={false} onCancel={onCancel} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(onCancel).not.toHaveBeenCalled();
    });
  });
});
