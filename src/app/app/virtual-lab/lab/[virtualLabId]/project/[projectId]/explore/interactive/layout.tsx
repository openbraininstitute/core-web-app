'use client';

import { ErrorBoundary } from 'react-error-boundary';
import { useParams } from 'next/navigation';
import { useSetAtom } from 'jotai';
import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import SimpleErrorComponent from '@/components/GenericErrorFallback';
// import BrainRegionsTree from '@/features/brain-region-tree';
import SideMenu from '@/components/SideMenu';

import { Label, Content, LinkItemKey } from '@/constants/virtual-labs/sidemenu';
import { idAtom as brainModelConfigIdAtom } from '@/state/brain-model-config';
import { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import { useSetBrainRegionFromQuery } from '@/hooks/brain-region-panel';
import { generateLabUrl } from '@/util/virtual-lab/urls';
import { defaultModelRelease } from '@/config';

type Props = {
  children: React.ReactNode;
  params: ServerSideComponentProp<WorkspaceContext, null>;
};

const BrainRegionsTree = dynamic(() => import('@/features/brain-region-tree'), { ssr: false });

export default function VirtualLabProjectInteractiveExploreLayout(props: Props) {
  const { virtualLabId, projectId } = useParams<{
    virtualLabId: string;
    projectId: string;
  }>();

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
                styles: 'rounded-full bg-primary-5 py-3 text-primary-9',
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
      <ErrorBoundary FallbackComponent={SimpleErrorComponent}>
        <BrainRegionsTree />
      </ErrorBoundary>
      <ErrorBoundary FallbackComponent={SimpleErrorComponent}>{children}</ErrorBoundary>
    </div>
  );
}
