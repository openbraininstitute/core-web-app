'use client';

import { ErrorBoundary } from 'react-error-boundary';
import { ReactNode, useEffect } from 'react';
import { useSetAtom } from 'jotai';
import dynamic from 'next/dynamic';

import SimpleErrorComponent from '@/components/GenericErrorFallback';
import Sidebar from '@/components/explore-section/Sidebar';

import { idAtom as brainModelConfigIdAtom } from '@/state/brain-model-config';
import { useSetBrainRegionFromQuery } from '@/hooks/brain-region-panel';
import { resolveDataKey } from '@/utils/key-builder';
import { defaultModelRelease } from '@/config';

const BrainRegionsHierarchy = dynamic(() => import('@/features/brain-region-hierarchy'), {
  ssr: false,
});

export default function ExploreInteractiveLayout({ children }: { children: ReactNode }) {
  const setConfigId = useSetAtom(brainModelConfigIdAtom);
  useSetBrainRegionFromQuery();

  // set Release as the configuration of explore interactive
  useEffect(() => {
    setConfigId(defaultModelRelease.id);
  }, [setConfigId]);

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
