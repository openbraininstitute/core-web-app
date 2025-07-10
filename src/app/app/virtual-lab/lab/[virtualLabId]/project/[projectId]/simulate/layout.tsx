'use client';

import { ReactNode, use } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import SimpleErrorComponent from '@/components/GenericErrorFallback';
import VirtualLabProjectSidebar from '@/components/VirtualLab/projects/VirtualLabProjectSidebar';
import SideMenu from '@/components/SideMenu';

import { useTileScopeQuery } from '@/components/VirtualLab/ScopeSelector';
import { LinkItemKey, Label } from '@/constants/virtual-labs/sidemenu';
import { generateLabUrl } from '@/util/virtual-lab/urls';
import { LinkItem } from '@/components/VerticalLinks';

import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

export default function VirtualLabProjectLayout({
  params: urlParams,
  children,
}: ServerSideComponentProp<WorkspaceContext, { s: string; t: string }> & { children: ReactNode }) {
  const params = use(urlParams);

  const labUrl = generateLabUrl(params.virtualLabId);

  const labProjectUrl = `${labUrl}/project/${params.projectId}`;
  const { type: modelType } = useTileScopeQuery();

  const links: LinkItem[] = [
    {
      key: LinkItemKey.Simulate,
      href: `${labProjectUrl}/simulate`,
      content: 'Experiment',
      styles:
        'rounded-full bg-primary-5 py-1 px-1 text-primary-9 w-[26px] font-semibold capitalize',
    },
  ];

  if (modelType)
    links.unshift({
      key: 'experiment/scope',
      href: `${labProjectUrl}/simulate?s=new&t=${modelType}`,
      content: <>{modelType.replace('-', ' ')}</>,
      styles: 'text-primary-5 hover:text-primary-2! cursor-pointer',
    });

  return (
    <div className="bg-primary-9 flex text-white">
      <ErrorBoundary FallbackComponent={SimpleErrorComponent}>
        <div className="top-0 flex h-screen w-1/4 min-w-1/4 flex-row gap-4">
          <SideMenu
            links={links}
            lab={{
              key: LinkItemKey.VirtualLab,
              id: params.virtualLabId,
              label: Label.VirtualLab,
              href: `${labUrl}/overview`,
            }}
            project={{
              key: LinkItemKey.Project,
              id: params.projectId,
              virtualLabId: params.virtualLabId,
              label: Label.Project,
              href: `${labProjectUrl}/home`,
            }}
          />

          <VirtualLabProjectSidebar
            virtualLabId={params.virtualLabId}
            projectId={params.projectId}
          />
        </div>
      </ErrorBoundary>
      <ErrorBoundary FallbackComponent={SimpleErrorComponent}>
        <div className="secondary-scrollbar flex h-screen w-full flex-col gap-10 overflow-y-auto pl-5">
          {children}
        </div>
      </ErrorBoundary>
    </div>
  );
}
