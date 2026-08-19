// src/contexts/ToastContext.jsx
import React, { createContext, useContext } from 'react';
import toast, { Toaster } from 'react-hot-toast';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const showToast = {
    success: (message, options = {}) => {
      toast.success(message, options);
    },
    
    error: (message, options = {}) => {
      toast.error(message, options);
    },
    
    info: (message, options = {}) => {
      toast(message, { icon: 'ℹ️', ...options });
    },
    
    warning: (message, options = {}) => {
      toast(message, { icon: '⚠️', ...options });
    },

    loading: (message, options = {}) => {
      return toast.loading(message, options);
    },

    update: (toastId, type, message, options = {}) => {
      if (type === 'success') {
        toast.success(message, { id: toastId, ...options });
      } else if (type === 'error') {
        toast.error(message, { id: toastId, ...options });
      } else {
        toast(message, { id: toastId, ...options });
      }
    },

    dismiss: (toastId) => {
      toast.dismiss(toastId);
    },
  };

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <Toaster 
        position="top-right" 
        toastOptions={{
          duration: 3000,
          style: { zIndex: 9999 },
        }} 
      />
    </ToastContext.Provider>
  );
};
