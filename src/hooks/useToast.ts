import { useCallback } from 'react';
import { toast } from 'sonner';

export const useToast = () => {
  const showSuccess = useCallback((title: string, message: string, duration?: number) => {
    toast.success(title, {
      description: message,
      duration: duration || 5000,
    });
  }, []);

  const showError = useCallback((title: string, message: string, duration?: number) => {
    toast.error(title, {
      description: message,
      duration: duration || 5000,
    });
  }, []);

  const showWarning = useCallback((title: string, message: string, duration?: number) => {
    toast.warning(title, {
      description: message,
      duration: duration || 5000,
    });
  }, []);

  const showInfo = useCallback((title: string, message: string, duration?: number) => {
    toast.info(title, {
      description: message,
      duration: duration || 5000,
    });
  }, []);

  // Legacy support for components that still expect these properties
  return {
    toasts: [], // Empty array for backward compatibility
    addToast: () => {}, // No-op for backward compatibility
    removeToast: () => {}, // No-op for backward compatibility
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
};