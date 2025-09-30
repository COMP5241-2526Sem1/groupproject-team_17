import { CONFIG } from 'src/global-config';
import { DashboardLayout } from 'src/layouts/dashboard';

import { AuthProvider } from 'src/auth/context/jwt';
import { AuthGuard } from 'src/auth/guard';
import { ErrorDialogProvider } from 'src/components/error-dialog';

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
