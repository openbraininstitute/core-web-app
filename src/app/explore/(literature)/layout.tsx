'use client';

import { ReactNode } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import SimpleErrorComponent from '@/components/GenericErrorFallback';
import Sidebar from '@/components/explore-section/Sidebar';
import BrainRegionsTree from '@/features/brain-region-tree';
import { useSetBrainRegionFromQuery } from '@/hooks/brain-region-panel';

type LiteratureLayoutProps = {
  children: ReactNode;
};

export default function GenericLayout({ children }: LiteratureLayoutProps) {
  useSetBrainRegionFromQuery();

  return (
    <div className="grid h-screen grid-cols-[min-content_min-content_auto] grid-rows-1">
      <ErrorBoundary FallbackComponent={SimpleErrorComponent}>
        <Sidebar />
      </ErrorBoundary>
      <ErrorBoundary FallbackComponent={SimpleErrorComponent}>
        <BrainRegionsTree />
      </ErrorBoundary>
      {children}
    </div>
  );
}
