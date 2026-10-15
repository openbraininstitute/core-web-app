'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { Spin } from 'antd';
import { useParams } from 'next/navigation';

import { ViewerCard } from '@/features/viewer-3d/viewer-card';

import { MorphoViewer } from './morpho-viewer/morpho-viewer';
import { useCellMorphologySwc } from './morpho-viewer/use-cell-morphology-swc';

import type { ICellMorphology } from '@/api/entitycore/types/entities/cell-morphology';
import type { WorkspaceContext } from '@/types/common';

export function CellMorphologyViewer({ entity }: { entity: ICellMorphology }) {
  if (!entity) return null;

  return (
    <ViewerCard error="Error while loading morphology viewer">
      <MorphoViewerLoader morphology={entity} />
    </ViewerCard>
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
    return <MorphoViewer className="h-full" swc={result} name={morphology.name} />;
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
