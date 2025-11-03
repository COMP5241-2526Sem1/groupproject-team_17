// Main export for Error Dialog system
export { default as ErrorDialog } from './error-dialog';
export { default as ErrorDialogProvider } from './error-dialog-provider';
export { useErrorDialog, ErrorDialogProvider as ErrorDialogContext } from './error-dialog-context';

// Global functions are automatically initialized when ErrorDialogProvider is used
// No need to import anything - just use:
// window.showError('Error message');
// window.showWarning('Warning message');
// window.showInfo('Info message');
// window.showCustomError('Title', 'Message');
// window.showConfirmError('Title', 'Message', onConfirm);
// window.showNetworkError(error, onRetry);
// window.showAPIError(error, onRetry);
// window.showValidationError(errors);
// window.hideError();
