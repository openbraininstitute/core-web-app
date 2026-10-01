'use client';

import { ErrorBoundary } from 'react-error-boundary';

import { withErrorConfig } from '@/components/GenericErrorFallback';

import { EmCellMeshViewer } from './viewer/em-mesh-viewer';

import type { IAsset } from '@/api/entitycore/types/shared/global';

export function EmCellMeshViewerCard({
  entity,
}: {
  entity: { id: string; name: string; assets: IAsset[] };
}) {
  return (
    // The morphology viewer's card.
    <div className="h-[min(740px,80vh)] min-h-90 w-full overflow-hidden rounded-2xl border border-white/20 text-primary-9">
      <div className="h-full bg-white">
        <ErrorBoundary
          FallbackComponent={withErrorConfig({
            cls: { container: 'bg-white' },
            showButtons: false,
            customError: 'Error while loading the mesh viewer',
          })}
        >
          <EmCellMeshViewer className="h-full" entity={entity} />
        </ErrorBoundary>
      </div>
    </div>
  );
}
