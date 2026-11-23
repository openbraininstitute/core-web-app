'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { Spin } from 'antd';
import { useParams } from 'next/navigation';

import { ViewerCard } from '@/features/viewer-3d/viewer-card';

import { MorphoViewer } from './morpho-viewer/morpho-viewer';
import { useCellMorphologySwc } from './morpho-viewer/use-cell-morphology-swc';
import { spinyAsset, useMeshForMorphology } from './spiny-comparison/find-mesh';
import { SpinyComparisonViewerCard } from './spiny-comparison/spiny-comparison-viewer';

import type { ICellMorphology } from '@/api/entitycore/types/entities/cell-morphology';
import type { WorkspaceContext } from '@/types/common';

export function CellMorphologyViewer({ entity }: { entity: ICellMorphology }) {
  if (!entity) return null;

  return (
    <ViewerCard error="Error while loading morphology viewer">
      {spinyAsset(entity) ? (
        <SpinyOrPlainViewer morphology={entity} />
      ) : (
        <MorphoViewerLoader morphology={entity} />
      )}
    </ViewerCard>
  );
}

/**
 * A morphology with spines, on the EM mesh it was made from where that can be found: the mesh, its skeleton and its
 * spines together, as a skeletonization's output shows them. Without the mesh, the morphology on its own.
 */
function SpinyOrPlainViewer({ morphology }: { morphology: ICellMorphology }) {
  const params = useParams<WorkspaceContext>();
  const ctx =
    params?.virtualLabId && params?.projectId
      ? { virtualLabId: params.virtualLabId, projectId: params.projectId }
      : null;
  const { data: mesh, isLoading } = useMeshForMorphology(morphology, ctx);
  const h5 = spinyAsset(morphology);
  if (isLoading) return <Loading text="Finding the mesh it was made from..." />;
  if (!mesh || !h5) return <MorphoViewerLoader morphology={morphology} />;
  return (
    <SpinyComparisonViewerCard
      className="h-full"
      mesh={mesh}
      morphology={{ id: morphology.id, asset: h5 }}
      ctx={ctx}
    />
  );
}

function Loading({ text }: { text: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3">
      <Spin indicator={<LoadingOutlined />} size="large" />
      <h2 className="text-primary-9 font-light">{text}</h2>
    </div>
  );
}

function MorphoViewerLoader({ morphology }: { morphology: ICellMorphology }) {
  const ctx = useParams<WorkspaceContext>();

  const { isLoading, result, error } = useCellMorphologySwc({ morphology, ctx });
  if (isLoading) return <Loading text="Loading morphology..." />;
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
