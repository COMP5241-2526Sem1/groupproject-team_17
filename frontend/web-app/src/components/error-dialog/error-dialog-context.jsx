'use client'
import PropTypes from 'prop-types';
import { createContext, useCallback, useContext, useState } from 'react';

// Create the context
const ErrorDialogContext = createContext(null);

// Error dialog provider component
export function ErrorDialogProvider({ children }) {
  const [errorState, setErrorState] = useState({
    isOpen: false,
    type: 'error', // 'error', 'warning', 'info', 'confirm'
    title: '',
    message: '',
    detailsTitle: 'Details',
    details: '',
    subDetails: '',
    severity: 'error',
    code: null,
    traceId: null,
    autoHideDuration: null,
    actions: null,
    onClose: null,
    onConfirm: null,
    onCancel: null,
  });

  // Show simple error
  const showError = useCallback((message, details = '', autoHide = false) => {
    setErrorState({
      isOpen: true,
      type: 'error',
      title: 'Error',
      message: message || 'An unexpected error occurred',
      details: details,
      severity: 'error',
      autoHideDuration: autoHide ? 5000 : null,
      actions: null,
      onClose: () => hideError(),
      onConfirm: null,
      onCancel: null,
    });
  }, []);

  // Show warning
  const showWarning = useCallback((message, details = '', autoHide = false) => {
    setErrorState({
      isOpen: true,
      type: 'warning',
      title: 'Warning',
      message: message || 'Warning',
      details: details,
      severity: 'warning',
      autoHideDuration: autoHide ? 5000 : null,
      actions: null,
      onClose: () => hideError(),
      onConfirm: null,
      onCancel: null,
    });
  }, []);

  // Show info
  const showInfo = useCallback((message, details = '', autoHide = false) => {
    setErrorState({
      isOpen: true,
      type: 'info',
      title: 'Information',
      message: message || 'Information',
      details: details,
      severity: 'info',
      autoHideDuration: autoHide ? 5000 : null,
      actions: null,
      onClose: () => hideError(),
      onConfirm: null,
      onCancel: null,
    });
  }, []);

  // Show custom error with title
  const showCustomError = useCallback((title, message, details = '', severity = 'error') => {
    setErrorState({
      isOpen: true,
      type: severity,
      title: title || 'Error',
      message: message || 'An unexpected error occurred',
      details: details,
      severity: severity,
      autoHideDuration: null,
      actions: null,
      onClose: () => hideError(),
      onConfirm: null,
      onCancel: null,
    });
  }, []);

  // Show confirmation error (with retry/cancel)
  const showConfirmError = useCallback((title, message, onConfirm, onCancel = null, details = '') => {
    setErrorState({
      isOpen: true,
      type: 'confirm',
      title: title || 'Confirm Action',
      message: message || 'Are you sure you want to continue?',
      details: details,
      severity: 'error',
      autoHideDuration: null,
      actions: ['cancel', 'confirm'],
      onClose: () => hideError(),
      onConfirm: () => {
        hideError();
        if (onConfirm) onConfirm();
      },
      onCancel: () => {
        hideError();
        if (onCancel) onCancel();
      },
    });
  }, []);

  // Show network error
  const showNetworkError = useCallback((error, onRetry = null) => {
    const isNetworkError = !navigator.onLine || error?.code === 'NETWORK_ERROR';
    const title = isNetworkError ? 'Network Error' : 'API Error';
    const message = isNetworkError
      ? 'Please check your internet connection and try again.'
      : error?.message || 'Failed to communicate with the server.';

    setErrorState({
      isOpen: true,
      type: onRetry ? 'confirm' : 'error',
      title: title,
      message: message,
      details: error?.details || error?.stack || '',
      severity: 'error',
      autoHideDuration: null,
      actions: onRetry ? ['cancel', 'retry'] : null,
      onClose: () => hideError(),
      onConfirm: onRetry ? () => {
        hideError();
        onRetry();
      } : null,
      onCancel: () => hideError(),
    });
  }, []);
  const showResError = useCallback((res, title = 'Operation Error', onRetry = null) => {
    const code = res?.code ? `${res.code}` : '9999';
    const message = `${res?.message}` || 'The operation failed to complete.';
    const details = `Res code: ${code}\nTrace ID: ${res?.traceId || 'N/A'}`;
    setErrorState({
      isOpen: true,
      type: onRetry ? 'confirm' : 'error',
      title: title,
      message: message,
      detailsTitle: 'Trace ID: ',
      details: details,
      subDetails: 'Copy this value for support.',
      code: res?.code || null,
      traceId: res?.traceId || null,
      severity: 'res',
      autoHideDuration: null,
      actions: onRetry ? ['cancel', 'retry'] : null,
      onClose: () => hideError(),
      onConfirm: onRetry ? () => {
        hideError();
        onRetry();
      } : null,
      onCancel: () => hideError(),
    });



  }, []);
  // Hide error dialog
  const hideError = useCallback(() => {
    setErrorState(prev => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  // Context value
  const contextValue = {
    errorState,
    showError,
    showResError,
    showWarning,
    showInfo,
    showCustomError,
    showConfirmError,
    showNetworkError,
    hideError,
  };

  return (
    <ErrorDialogContext.Provider value={contextValue}>
      {children}
    </ErrorDialogContext.Provider>
  );
}

// Hook to use error dialog context
export function useErrorDialog() {
  const context = useContext(ErrorDialogContext);
  if (!context) {
    throw new Error('useErrorDialog must be used within an ErrorDialogProvider');
  }
  return context;
}

// HOC to inject error dialog functions
export function withErrorDialog(Component) {
  return function WrappedComponent(props) {
    const errorDialog = useErrorDialog();
    return <Component {...props} errorDialog={errorDialog} />;
  };
}

ErrorDialogProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
