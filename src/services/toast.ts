// Lightweight module-level event bus for toasts.
// Component registers itself via _setListener; callers use toast.show/error/success.
// This avoids prop-drilling and works outside React components (e.g. API interceptor).

type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

type Listener = (msg: ToastMessage) => void;
let _listener: Listener | null = null;
let _idCounter = 0;

export const toast = {
  show(message: string, type: ToastType = 'info') {
    _listener?.({ id: ++_idCounter, message, type });
  },
  success: (message: string) => toast.show(message, 'success'),
  error:   (message: string) => toast.show(message, 'error'),
  info:    (message: string) => toast.show(message, 'info'),

  /** Called once by the <Toast /> component on mount. */
  _setListener(fn: Listener | null) {
    _listener = fn;
  },
};
