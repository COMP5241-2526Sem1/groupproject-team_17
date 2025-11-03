import { CONFIG } from 'src/global-config';
import { DashboardLayout } from 'src/layouts/dashboard';

import { ErrorDialogProvider } from 'src/components/error-dialog';

import { AuthGuard } from 'src/auth/guard';
import { AuthProvider } from 'src/auth/context/jwt';

// ----------------------------------------------------------------------

export default function Layout({ children }) {
  if (CONFIG.auth.skip) {
    return <DashboardLayout>{children}</DashboardLayout>;
  }

  return (
    <AuthProvider>
      <ErrorDialogProvider>
        <AuthGuard>
          <DashboardLayout>{children}</DashboardLayout>
        </AuthGuard>
      </ErrorDialogProvider>
    </AuthProvider>
  );
}
