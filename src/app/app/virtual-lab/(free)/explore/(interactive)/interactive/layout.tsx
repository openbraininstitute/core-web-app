'use client';

import { ErrorBoundary } from 'react-error-boundary';
import { ReactNode } from 'react';
import dynamic from 'next/dynamic';

import SimpleErrorComponent from '@/components/GenericErrorFallback';
import Sidebar from '@/components/explore-section/Sidebar';

import { resolveDataKey } from '@/utils/key-builder';

const BrainRegionsHierarchy = dynamic(() => import('@/features/brain-region-hierarchy'), {
  ssr: false,
  loading() {
    return <div className="bg-primary-8 w-[340px]" />;
  },
});

export default function ExploreInteractiveLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid h-screen grid-cols-[min-content_min-content_auto] grid-rows-1">
      <ErrorBoundary FallbackComponent={SimpleErrorComponent}>
        <Sidebar />
      </ErrorBoundary>
      <ErrorBoundary FallbackComponent={SimpleErrorComponent}>
        <BrainRegionsHierarchy dataKey={resolveDataKey({ section: 'explore' })} />
      </ErrorBoundary>
      <ErrorBoundary FallbackComponent={SimpleErrorComponent}>{children}</ErrorBoundary>
    </div>
  );
}
