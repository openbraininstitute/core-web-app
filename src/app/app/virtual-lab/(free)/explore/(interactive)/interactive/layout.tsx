'use client';

import { useSetAtom } from 'jotai';
import { ReactNode, useEffect } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import SimpleErrorComponent from '@/components/GenericErrorFallback';
import { BrainRegionsSidebar } from '@/components/build-section/BrainRegionSelector';
import Sidebar from '@/components/explore-section/Sidebar';
import { defaultModelRelease } from '@/config';
import { useSetBrainRegionFromQuery } from '@/hooks/brain-region-panel';
import { idAtom as brainModelConfigIdAtom } from '@/state/brain-model-config';

export default function ExploreInteractiveLayout({ children }: { children: ReactNode }) {
  const setConfigId = useSetAtom(brainModelConfigIdAtom);
  useSetBrainRegionFromQuery();

  // set Release as the configuration of explore interactive
  useEffect(() => setConfigId(defaultModelRelease.id), [setConfigId]);

  return (
    <div className="grid h-screen grid-cols-[min-content_min-content_auto] grid-rows-1">
      <ErrorBoundary FallbackComponent={SimpleErrorComponent}>
        <Sidebar />
      </ErrorBoundary>
      <ErrorBoundary FallbackComponent={SimpleErrorComponent}>
        <BrainRegionsSidebar />
      </ErrorBoundary>
      <ErrorBoundary FallbackComponent={SimpleErrorComponent}>{children}</ErrorBoundary>
    </div>
  );
}
