'use client';

import { ErrorBoundary } from 'react-error-boundary';
import { ReactNode, use } from 'react';

import SimpleErrorComponent from '@/components/GenericErrorFallback';
import VirtualLabProjectSidebar from '@/components/VirtualLab/projects/VirtualLabProjectSidebar';
import Nav from '@/components/build-section/virtual-lab/me-model/Nav';

import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

type Props = ServerSideComponentProp<WorkspaceContext, null> & {
  children: ReactNode;
};

export default function VirtualLabProjectLayout({ params: promisedParams, children }: Props) {
  const { virtualLabId, projectId } = use(promisedParams);

  return (
    <div className="bg-primary-9 flex pr-5 text-white">
      <ErrorBoundary FallbackComponent={SimpleErrorComponent}>
        <div className="top-0 flex h-screen w-1/4 flex-row gap-4">
          <Nav params={{ virtualLabId, projectId }} />
          <VirtualLabProjectSidebar virtualLabId={virtualLabId} projectId={projectId} />
        </div>
      </ErrorBoundary>
      <ErrorBoundary FallbackComponent={SimpleErrorComponent}>
        <div className="flex h-screen w-3/4 flex-col gap-10 overflow-y-auto pl-5">{children}</div>
      </ErrorBoundary>
    </div>
  );
}
