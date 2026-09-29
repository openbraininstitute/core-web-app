'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { Spin } from 'antd';
import { useParams } from 'next/navigation';
import { ErrorBoundary } from 'react-error-boundary';

import { withErrorConfig } from '@/components/GenericErrorFallback';
import { type TViewVariant, ViewVariant } from '@/constants';
import { detailViewCardBorderClass } from '@/ui/segments/detail-view/variant-styles';
import { cn } from '@/utils/css-class';

import { MorphoViewer } from './morpho-viewer/morpho-viewer';
import { useCellMorphologySwc } from './morpho-viewer/use-cell-morphology-swc';

import type { ICellMorphology } from '@/api/entitycore/types/entities/cell-morphology';
import type { WorkspaceContext } from '@/types/common';

export function CellMorphologyViewer({
  entity,
  variant = ViewVariant.Default,
}: {
  entity: ICellMorphology;
  variant?: TViewVariant;
}) {
  if (!entity) return null;

  return (
    // As tall as the circuit viewer: its chrome and menus need the room.
    <div
      className={cn(
        // Clipped to the padding, the white stays out from under a translucent border.
        'h-[min(740px,80vh)] min-h-90 w-full overflow-hidden rounded-2xl border bg-white bg-clip-padding text-primary-9',
        detailViewCardBorderClass(variant)
      )}
    >
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

  const { isLoading, result, error } = useCellMorphologySwc({ morphology, ctx });
  if (isLoading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3">
        <Spin indicator={<LoadingOutlined />} size="large" />
        <h2 className="text-primary-9 font-light">Loading morphology...</h2>
      </div>
    );
  }
  if (result) {
    return <MorphoViewer className="h-full rounded-2xl" swc={result} name={morphology.name} />;
  }
  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3">
        <h3>{error instanceof Error ? error.message : 'Error loading morphology viewer'}</h3>
      </div>
    );
  }
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-white">
      No morphology data available.
    </div>
  );
}
