'use client';

import PropTypes from 'prop-types';
import { useEffect } from 'react';

import ErrorDialog from './error-dialog';
import { ErrorDialogProvider, useErrorDialog } from './error-dialog-context';
import { cleanupGlobalErrorDialog, initializeGlobalErrorDialog } from './global-error-functions';

// ----------------------------------------------------------------------

// Error Dialog Manager Component
function ErrorDialogManager() {
  const { errorState } = useErrorDialog();

  return (
    <ErrorDialog
      open={errorState.isOpen}
      type={errorState.type}
      title={errorState.title}
      message={errorState.message}
      detailsTitle={errorState.detailsTitle}
      subDetails={errorState.subDetails}
      details={errorState.details}
      severity={errorState.severity}
      code={errorState.code}
      traceId={errorState.traceId}
      autoHideDuration={errorState.autoHideDuration}
      actions={errorState.actions}
      onClose={errorState.onClose}
      onConfirm={errorState.onConfirm}
      onCancel={errorState.onCancel}
    />
  );
}

// Global Function Initializer Component
function GlobalFunctionInitializer() {
  const errorDialogFunctions = useErrorDialog();

  useEffect(() => {
    // Initialize global functions when component mounts
    initializeGlobalErrorDialog(errorDialogFunctions);

    // Cleanup when component unmounts
    return () => {
      cleanupGlobalErrorDialog();
    };
  }, [errorDialogFunctions]);

  return null;
}

// Main Error Dialog Provider with Manager
export default function ErrorDialogProviderWithManager({ children }) {
  return (
    <ErrorDialogProvider>
      {children}
      <ErrorDialogManager />
      <GlobalFunctionInitializer />
    </ErrorDialogProvider>
  );
}

ErrorDialogProviderWithManager.propTypes = {
  children: PropTypes.node.isRequired,
};

// Export individual components and hooks
export { default as ErrorDialog } from './error-dialog';
export { ErrorDialogProvider, useErrorDialog } from './error-dialog-context';

