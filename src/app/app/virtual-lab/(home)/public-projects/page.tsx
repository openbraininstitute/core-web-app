import { ErrorBoundary } from 'react-error-boundary';
import SimpleErrorComponent from '@/components/GenericErrorFallback';

import PublicProjectList from '@/components/PublicProjects/PublicProjectList';

export const dynamic = 'force-dynamic';

export default async function PublicProjectsListingPage() {
  return (
    <ErrorBoundary FallbackComponent={SimpleErrorComponent}>
      <div className="flex w-full flex-row justify-between gap-x-8">
        <PublicProjectList />
      </div>
    </ErrorBoundary>
  );
}
