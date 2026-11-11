import { ErrorBoundary } from '@sentry/nextjs';

import { SharedLayout } from '@/ui/layouts/shared-layout';

// TODO: error page when sync workspace failed
// it should show server error 500 with descriptive message and description
function ErrorPage() {
  return <div />;
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary fallback={<ErrorPage />}>
      <SharedLayout>{children}</SharedLayout>
    </ErrorBoundary>
  );
}
