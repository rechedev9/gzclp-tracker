import { createPortal } from 'react-dom';
import { useToast } from '@/contexts/toast-context';

export function ToastContainer(): React.ReactNode {
  const { toasts, dismiss } = useToast();

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 items-center pointer-events-none"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-center gap-3 px-4 py-3 bg-[var(--bg-header)] text-[var(--text-header)] text-xs font-bold shadow-lg border border-[var(--border-color)] animate-[fadeSlideUp_0.2s_ease-out]"
        >
          <span>{t.message}</span>
          {t.action && (
            <button
              onClick={() => {
                t.action?.onClick();
                dismiss(t.id);
              }}
              className="text-[var(--fill-progress)] font-bold underline cursor-pointer bg-transparent border-none p-0 text-xs whitespace-nowrap"
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>,
    document.body
  );
}
