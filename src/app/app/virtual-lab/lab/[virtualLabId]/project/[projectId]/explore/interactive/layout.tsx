'use client';

import { ErrorBoundary } from 'react-error-boundary';
import { Suspense, use } from 'react';
import dynamic from 'next/dynamic';

import SimpleErrorComponent from '@/components/GenericErrorFallback';

import { Label, Content, LinkItemKey } from '@/constants/virtual-labs/sidemenu';
import { Container as SideMenuContainer } from '@/components/SideMenu';
import { generateLabUrl } from '@/util/virtual-lab/urls';
import { resolveDataKey } from '@/utils/key-builder';

import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

const SideMenu = dynamic(() => import('@/components/SideMenu'), {
  ssr: false,
  loading: () => <SideMenuContainer />,
});

type Props = ServerSideComponentProp<WorkspaceContext, null> & {
  children: React.ReactNode;
};

const BrainRegionsHierarchy = dynamic(() => import('@/features/brain-region-hierarchy'), {
  ssr: false,
  loading() {
    return <div className="bg-primary-8 w-[340px]" />;
  },
});

export default function Layout({ params, children }: Props) {
  const { virtualLabId, projectId } = use(params);

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
      <ErrorBoundary FallbackComponent={SimpleErrorComponent}>
        <Suspense
          fallback={
            <div className="flex h-full w-full items-center justify-center">Loading...</div>
          }
        >
          <BrainRegionsHierarchy dataKey={resolveDataKey({ section: 'explore', projectId })} />
        </Suspense>
      </ErrorBoundary>
      <ErrorBoundary FallbackComponent={SimpleErrorComponent}>{children}</ErrorBoundary>
    </div>
  );
}
