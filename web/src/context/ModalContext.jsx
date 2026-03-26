import { createContext, useContext, useState, useCallback } from 'react';

const ModalContext = createContext(null);

export const ModalProvider = ({ children }) => {
  const [modal, setModal] = useState({
    isOpen: false,
    context: 'confirmation',
    title: '',
    message: '',
    detail: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    showCancel: true,
    onConfirm: null,
    onCancel: null,
  });

  const show = useCallback((options = {}) => {
    setModal(prev => ({
      ...prev,
      isOpen: true,
      context: options.context || 'confirmation',
      title: options.title || '',
      message: options.message || '',
      detail: options.detail || '',
      confirmText: options.confirmText || 'Confirm',
      cancelText: options.cancelText || 'Cancel',
      showCancel: options.showCancel !== undefined ? options.showCancel : true,
      onConfirm: options.onConfirm || null,
      onCancel: options.onCancel || null,
    }));
  }, []);

  const close = useCallback(() => {
    setModal(prev => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  const value = {
    modal,
    showModal: show,
    closeModal: close,
  };

  return (
    <ModalContext.Provider value={value}>
      {children}
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};
