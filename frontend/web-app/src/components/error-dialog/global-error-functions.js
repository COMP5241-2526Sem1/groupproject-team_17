// Global error dialog utility functions
// These functions will be attached to the window object for global access

let errorDialogFunctions = null;
let isInitialized = false;

// Initialize the global functions with the context functions
export function initializeGlobalErrorDialog(contextFunctions) {
  // Prevent multiple initializations
  if (isInitialized && errorDialogFunctions) {
    return;
  }

  errorDialogFunctions = contextFunctions;
  isInitialized = true;

  // Attach to window object for global access
  if (typeof window !== 'undefined') {
    // Simple error
    window.showError = (message, details = '', autoHide = false) => {
      if (errorDialogFunctions?.showError) {
        errorDialogFunctions.showError(message, details, autoHide);
      } else {
        console.error('Error Dialog not initialized:', message);
        // Fallback to alert
        alert(message);
      }
    };

    // Warning
    window.showWarning = (message, details = '', autoHide = false) => {
      if (errorDialogFunctions?.showWarning) {
        errorDialogFunctions.showWarning(message, details, autoHide);
      } else {
        console.warn('Warning Dialog not initialized:', message);
        alert(message);
      }
    };

    // Info
    window.showInfo = (message, details = '', autoHide = true) => {
      if (errorDialogFunctions?.showInfo) {
        errorDialogFunctions.showInfo(message, details, autoHide);
      } else {
        console.info('Info Dialog not initialized:', message);
        alert(message);
      }
    };

    // Custom error with title
    window.showCustomError = (title, message, details = '', severity = 'error') => {
      if (errorDialogFunctions?.showCustomError) {
        errorDialogFunctions.showCustomError(title, message, details, severity);
      } else {
        console.error('Custom Error Dialog not initialized:', title, message);
        alert(`${title}: ${message}`);
      }
    };

    // Confirmation error
    window.showConfirmError = (title, message, onConfirm, onCancel = null, details = '') => {
      if (errorDialogFunctions?.showConfirmError) {
        errorDialogFunctions.showConfirmError(title, message, onConfirm, onCancel, details);
      } else {
        console.error('Confirm Error Dialog not initialized:', title, message);
        if (confirm(`${title}: ${message}`)) {
          if (onConfirm) onConfirm();
        } else {
          if (onCancel) onCancel();
        }
      }
    };

    // Network error
    window.showNetworkError = (error, onRetry = null) => {
      if (errorDialogFunctions?.showNetworkError) {
        errorDialogFunctions.showNetworkError(error, onRetry);
      } else {
        console.error('Network Error Dialog not initialized:', error);
        const message = error?.message || 'Network error occurred';
        if (onRetry && confirm(`${message}\n\nWould you like to retry?`)) {
          onRetry();
        } else {
          alert(message);
        }
      }
    };

    // Response error (for backend API responses)
    window.showResError = (res, title = 'Operation Error', onRetry = null) => {
      if (errorDialogFunctions?.showResError) {
        errorDialogFunctions.showResError(res, title, onRetry);
      } else {
        console.error('Response Error Dialog not initialized:', res);
        const message = `Error Code: ${res?.code || '9999'}\n${res?.message || 'The operation failed to complete.'}`;
        if (onRetry && confirm(`${message}\n\nWould you like to retry?`)) {
          onRetry();
        } else {
          alert(message);
        }
      }
    };

    // Hide error
    window.hideError = () => {
      if (errorDialogFunctions?.hideError) {
        errorDialogFunctions.hideError();
      }
    };

    // Convenience functions for common use cases
    window.showAPIError = (error, onRetry = null) => {
      const title = 'API Error';
      const message = error?.response?.data?.message || error?.message || 'Failed to communicate with the server';
      const details = error?.response?.data?.details || error?.stack || '';

      if (onRetry) {
        window.showConfirmError(title, message, onRetry, null, details);
      } else {
        window.showCustomError(title, message, details, 'error');
      }
    };

    window.showValidationError = (errors) => {
      const title = 'Validation Error';
      let message = 'Please correct the following errors:';
      let details = '';

      if (Array.isArray(errors)) {
        details = errors.join('\n');
      } else if (typeof errors === 'object') {
        details = Object.entries(errors)
          .map(([field, error]) => `${field}: ${error}`)
          .join('\n');
      } else {
        message = errors;
      }

      window.showCustomError(title, message, details, 'warning');
    };

    console.log('Global error dialog functions initialized');
  }
}

// Cleanup function
export function cleanupGlobalErrorDialog() {
  if (typeof window !== 'undefined') {
    delete window.showError;
    delete window.showWarning;
    delete window.showInfo;
    delete window.showCustomError;
    delete window.showConfirmError;
    delete window.showNetworkError;
    delete window.showResError;
    delete window.hideError;
    delete window.showAPIError;
    delete window.showValidationError;
  }
  errorDialogFunctions = null;
  isInitialized = false;
}
