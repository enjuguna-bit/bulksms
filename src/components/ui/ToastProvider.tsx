import React, { createContext, useContext, useState, useCallback } from 'react';
import { View } from 'react-native';
import { Toast } from './Toast';

type ToastType = 'success' | 'error' | 'warning' | 'info';
type ToastPosition = 'top' | 'bottom' | 'center';

interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  position?: ToastPosition;
  showProgress?: boolean;
}

interface ToastContextType {
  showToast: (type: ToastType, message: string, duration?: number, position?: ToastPosition, showProgress?: boolean) => void;
  showSuccess: (message: string, duration?: number, position?: ToastPosition, showProgress?: boolean) => void;
  showError: (message: string, duration?: number, position?: ToastPosition, showProgress?: boolean) => void;
  showWarning: (message: string, duration?: number, position?: ToastPosition, showProgress?: boolean) => void;
  showInfo: (message: string, duration?: number, position?: ToastPosition, showProgress?: boolean) => void;
  clearAllToasts: () => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((type: ToastType, message: string, duration?: number, position: ToastPosition = 'top', showProgress: boolean = true) => {
    const id = Date.now().toString();
    const newToast: ToastMessage = { id, type, message, duration, position, showProgress };

    setToasts(prev => [...prev, newToast]);
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const showSuccess = useCallback((message: string, duration?: number, position?: ToastPosition, showProgress?: boolean) => {
    showToast('success', message, duration, position, showProgress);
  }, [showToast]);

  const showError = useCallback((message: string, duration?: number, position?: ToastPosition, showProgress?: boolean) => {
    showToast('error', message, duration, position, showProgress);
  }, [showToast]);

  const showWarning = useCallback((message: string, duration?: number, position?: ToastPosition, showProgress?: boolean) => {
    showToast('warning', message, duration, position, showProgress);
  }, [showToast]);

  const showInfo = useCallback((message: string, duration?: number, position?: ToastPosition, showProgress?: boolean) => {
    showToast('info', message, duration, position, showProgress);
  }, [showToast]);

  const value: ToastContextType = {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    clearAllToasts,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
        {toasts.map((toast, index) => (
          <Toast
            key={toast.id}
            type={toast.type}
            message={toast.message}
            duration={toast.duration}
            position={toast.position}
            showProgress={toast.showProgress}
            onHide={() => hideToast(toast.id)}
            index={index}
          />
        ))}
      </View>
    </ToastContext.Provider>
  );
};
