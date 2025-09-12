'use client';

import { ReactNode, Suspense, useEffect, use } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useSetAtom } from 'jotai';

import Nav from '@/components/build-section/virtual-lab/me-model/Nav';
import SimpleErrorComponent from '@/components/GenericErrorFallback';
import { sectionAtom } from '@/state/application';

import type { WorkspaceContext } from '@/types/common';

type GenericLayoutProps = {
  children: ReactNode;
  params: Promise<WorkspaceContext>;
};

export default function Layout({ params: urlParams, children }: GenericLayoutProps) {
  const params = use(urlParams);

  const setSection = useSetAtom(sectionAtom);
  useEffect(() => setSection('build'), [setSection]);

  return (
    <div className="grid grid-cols-[min-content_auto] bg-white">
      <Nav params={params} />

      <div className="flex flex-col">
        <ErrorBoundary FallbackComponent={SimpleErrorComponent}>
          <div className="flex h-full flex-col">
            <Suspense fallback={null}>{children}</Suspense>
          </div>
        </ErrorBoundary>
      </div>
    </div>
  );
}
