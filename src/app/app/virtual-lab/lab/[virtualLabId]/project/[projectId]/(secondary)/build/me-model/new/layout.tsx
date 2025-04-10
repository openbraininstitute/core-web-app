'use client';

import { ReactNode, Suspense, useEffect, use } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useSetAtom } from 'jotai';

import SimpleErrorComponent from '@/components/GenericErrorFallback';
import Nav from '@/components/build-section/virtual-lab/me-model/Nav';
import { sectionAtom } from '@/state/application';

type GenericLayoutProps = {
  children: ReactNode;
  params: Promise<{ virtualLabId: string; projectId: string }>;
};

export default function BuildMEModelLayout(props: GenericLayoutProps) {
  const params = use(props.params);

  const {
    children
  } = props;

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
