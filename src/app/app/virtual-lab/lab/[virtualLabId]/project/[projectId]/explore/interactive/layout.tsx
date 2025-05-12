'use client';

import { ErrorBoundary } from 'react-error-boundary';
import { Suspense, use, useEffect } from 'react';
import { useSetAtom } from 'jotai';
import dynamic from 'next/dynamic';

// import BrainRegionsTree from '@/features/brain-region-tree';
import SimpleErrorComponent from '@/components/GenericErrorFallback';
import SideMenu from '@/components/SideMenu';

import { Label, Content, LinkItemKey } from '@/constants/virtual-labs/sidemenu';
import { idAtom as brainModelConfigIdAtom } from '@/state/brain-model-config';
import { useSetBrainRegionFromQuery } from '@/hooks/brain-region-panel';
import { generateLabUrl } from '@/util/virtual-lab/urls';
import { defaultModelRelease } from '@/config';

import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

type Props = ServerSideComponentProp<WorkspaceContext, null> & {
  children: React.ReactNode;
};

// remove this when the new brain region tree is ready
// const BrainRegionsTree = dynamic(() => import('@/features/brain-region-tree'), { ssr: false });
const BrainRegionsTree = dynamic(() => import('@/features/brain-region-hierarchy'), {
  ssr: false,
});

export default function Layout(props: Props) {
  const { virtualLabId, projectId } = use(props.params);

  const { children } = props;

  const setConfigId = useSetAtom(brainModelConfigIdAtom);
  useSetBrainRegionFromQuery();

  // set Release as the configuration of explore interactive
  useEffect(() => setConfigId(defaultModelRelease.id), [setConfigId]);

  const labUrl = generateLabUrl(virtualLabId);
  const labProjectUrl = `${labUrl}/project/${projectId}`;

  return (
    <div className="grid h-screen grid-cols-[min-content_min-content_auto] grid-rows-1">
      <ErrorBoundary FallbackComponent={SimpleErrorComponent}>
        <div className="flex flex-row gap-4">
          <SideMenu
            links={[
              {
                key: LinkItemKey.Explore,
                href: `${labProjectUrl}/explore/interactive`,
                content: Content.Explore,
                styles: 'rounded-full bg-primary-5 py-3 text-primary-9 w-[21px]',
              },
            ]}
            lab={{
              key: LinkItemKey.VirtualLab,
              id: virtualLabId,
              label: Label.VirtualLab,
              href: `${labUrl}/overview`,
            }}
            project={{
              key: LinkItemKey.Project,
              virtualLabId,
              id: projectId,
              label: Label.Project,
              href: `${labProjectUrl}/home`,
            }}
          />
        </div>
      </ErrorBoundary>
      {/* <BrainRegionsTree /> */}
      <ErrorBoundary FallbackComponent={SimpleErrorComponent}>
        <Suspense
          fallback={
            <div className="flex h-full w-full items-center justify-center">Loading...</div>
          }
        >
          <BrainRegionsTree dataKey={`explore/${projectId}`} />
        </Suspense>
      </ErrorBoundary>
      <ErrorBoundary FallbackComponent={SimpleErrorComponent}>{children}</ErrorBoundary>
    </div>
  );
}
