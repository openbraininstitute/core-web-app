'use client';

import { ReactNode, use } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import dynamic from 'next/dynamic';
import { ErrorComponent, withErrorConfig } from '@/components/GenericErrorFallback';

import { resolveDataKey } from '@/utils/key-builder';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

type GenericLayoutProps = ServerSideComponentProp<WorkspaceContext, null> & {
  children: ReactNode;
};
const BrainRegionsHierarchy = dynamic(() => import('@/features/brain-region-hierarchy'), {
  ssr: false,
});
export default function BuildMEModelLayout({ params, children }: GenericLayoutProps) {
  // const setSection = useSetAtom(sectionAtom);
  const { projectId } = use(params);

  // useEffect(() => setSection('build'), [setSection]);
  const dataKey = resolveDataKey({ projectId, section: 'build' });
  return (
    <div className="grid grid-cols-[min-content_auto] bg-white">
      <ErrorBoundary
        FallbackComponent={withErrorConfig({
          showButtons: false,
        })}
      >
        <BrainRegionsHierarchy dataKey={dataKey} />
      </ErrorBoundary>

      <div className="flex flex-col">
        <ErrorBoundary FallbackComponent={ErrorComponent}>
          <div className="flex h-full flex-col p-10">{children}</div>
        </ErrorBoundary>
      </div>
    </div>
  );
}
