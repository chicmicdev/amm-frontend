import { useCallback } from 'react';
import toast from 'react-hot-toast';

export type ToastKind = 'success' | 'error' | 'info';

/**
 * Thin wrapper over react-hot-toast — no Provider required.
 */
export function useToast() {
  const showToast = useCallback((type: ToastKind, message: string) => {
    if (type === 'success') {
      toast.success(message, { duration: 5000 });
      return;
    }
    if (type === 'error') {
      toast.error(message, { duration: 7000 });
      return;
    }
    toast(message, { duration: 4500, icon: 'ℹ️' });
  }, []);

  return { showToast };
}
