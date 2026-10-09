'use client';

import { useQuery } from '@tanstack/react-query';

import { getEmCellMesh } from '@/api/entitycore/queries/experimental/em-cell-mesh';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Skeleton } from '@/ui/molecules/skeleton';
import { keyBuilder } from '@/ui/use-query-keys/data';

import { EmCellMeshViewerCard } from './detail-view';
import { meshAsset } from './viewer/mesh-asset';

import type { ReactNode } from 'react';
import type { InteractiveViewerProps } from '@/ui/segments/mini-detail-view/interactive-viewers';

// Listing rows carry their assets; a record without them is fetched by id.
export function EmCellMeshPreviewViewer({ record }: InteractiveViewerProps) {
  const recordAssets = 'assets' in record ? record.assets : undefined;
  const { virtualLabId, projectId } = useWorkspace();
  const context = { virtualLabId, projectId };
  const {
    data: mesh,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: keyBuilder.entity({ id: record.id, context, type: EntityTypeDict.EMCellMesh }),
    queryFn: () => getEmCellMesh({ id: record.id, context }),
    enabled: !recordAssets,
    refetchOnWindowFocus: false,
  });

  if (isLoading) return <Skeleton className="h-full w-full rounded-2xl" />;

  if (isError) {
    return (
      <Note>
        Could not load this mesh.
        <button type="button" className="text-primary-8 underline" onClick={() => refetch()}>
          Try again
        </button>
      </Note>
    );
  }

  const asset = meshAsset(recordAssets ?? mesh?.assets);
  if (!asset) return <Note>This mesh has no viewable file.</Note>;

  return (
    <EmCellMeshViewerCard
      className="h-full min-h-0 border-neutral-2"
      entity={{ id: record.id, name: record.name }}
      asset={asset}
    />
  );
}

function Note({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 rounded-2xl border border-neutral-2 text-sm text-gray-500">
      {children}
    </div>
  );
}
