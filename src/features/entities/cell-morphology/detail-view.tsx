'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { Spin } from 'antd';
import { useParams } from 'next/navigation';
import { ErrorBoundary } from 'react-error-boundary';

// We disable enhanced somas until they are fixed on the backend.
// import { useSwcContentUrl } from '@/util/content-url';

import { withErrorConfig } from '@/components/GenericErrorFallback';
import { MorphoViewer } from '@/components/MorphoViewer';
import { useLoadCellMorphology3DAsset } from '@/state/morpho-viewer';

import type { ICellMorphology } from '@/api/entitycore/types/entities/cell-morphology';
import type { WorkspaceContext } from '@/types/common';

export function CellMorphologyViewer({ entity }: { entity: ICellMorphology }) {
  if (!entity) return null;

  return (
    <div className="h-[calc(100vh-20rem)] min-h-[480px] w-full">
      <div className="h-full">
        <ErrorBoundary
          FallbackComponent={withErrorConfig({
            cls: { container: 'bg-white' },
            showButtons: false,
            customError: 'Error while loading morphology viewer',
          })}
        >
          <MorphoViewerLoader morphology={entity} />
        </ErrorBoundary>
      </div>
    </div>
  );
}

function MorphoViewerLoader({ morphology }: { morphology: ICellMorphology }) {
  const ctx = useParams<WorkspaceContext>();

  const { isLoading, result, error } = useLoadCellMorphology3DAsset({ morphology, ctx });
  // We disable enhanced somas until they are fixed on the backend.
  // const swcContentUrl = useSwcContentUrl(resource.distribution);
  if (isLoading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3">
        <Spin indicator={<LoadingOutlined />} size="large" />
        <h2 className="text-primary-9 font-light">Loading morphology...</h2>
      </div>
    );
  }
  if (result) {
    return (
      <MorphoViewer
        className="h-full"
        swc={result}
        // We disable enhanced somas until they are fixed on the backend.
        // contentUrl={swcContentUrl}
      />
    );
  }
  if (!isLoading && !result) {
    return (
      <div className="border-neutral-3 flex h-full w-full flex-col items-center justify-center gap-3 border">
        No morphology data available.
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3">
        <h3>{error instanceof Error ? error.message : 'Error loading morphology viewer'}</h3>
      </div>
    );
  }
}
