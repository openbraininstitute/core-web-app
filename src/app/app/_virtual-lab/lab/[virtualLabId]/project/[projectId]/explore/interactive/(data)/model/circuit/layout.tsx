'use client';

import { useParams } from 'next/navigation';
import { ReactNode } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import SimpleErrorComponent from '@/components/GenericErrorFallback';

export default function ExploreCircuitListingView({ children }: { children: ReactNode }) {
  const params = useParams();

  if (params?.id)
    return <ErrorBoundary FallbackComponent={SimpleErrorComponent}>{children}</ErrorBoundary>;

  return (
    <div className="bg-primary-9 flex h-full w-full" id="interactive-data-layout">
      <ErrorBoundary FallbackComponent={SimpleErrorComponent}>
        <div className="h-full w-full overflow-y-scroll bg-white pb-20 text-white">{children}</div>
      </ErrorBoundary>
    </div>
  );
}
