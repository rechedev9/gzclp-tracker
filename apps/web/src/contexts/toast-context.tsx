import { createContext, useCallback, useContext, useRef, useState } from 'react';

interface ToastAction {
  readonly label: string;
  readonly onClick: () => void;
}

interface Toast {
  readonly id: number;
  readonly message: string;
  readonly action?: ToastAction;
}

interface ToastContextValue {
  readonly toasts: readonly Toast[];
  readonly toast: (opts: { message: string; action?: ToastAction }) => void;
  readonly dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const MAX_TOASTS = 3;
const AUTO_DISMISS_MS = 3000;

export function ToastProvider({
  children,
}: {
  readonly children: React.ReactNode;
}): React.ReactNode {
  const [toasts, setToasts] = useState<readonly Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number): void => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (opts: { message: string; action?: ToastAction }): void => {
      const id = nextId.current++;
      setToasts((prev) => [...prev.slice(-(MAX_TOASTS - 1)), { id, ...opts }]);
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>{children}</ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}
