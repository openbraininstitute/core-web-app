import { useQuery } from '@tanstack/react-query';

import { downloadAsset } from '@/api/entitycore/queries/assets';
import { EntityTypeDict } from '@/api/entitycore/types';
import { keyBuilder } from '@/ui/use-query-keys/data';

import type { ICellMorphology } from '@/api/entitycore/types/entities/cell-morphology';
import type { WorkspaceContext } from '@/types/common';

export function useLoadCellMorphology3DAsset({
  morphology,
  ctx,
}: {
  morphology: ICellMorphology;
  ctx?: WorkspaceContext;
}) {
  const asset = morphology?.assets?.find((a) => a.content_type === 'application/swc');
  if (!asset) {
    throw new Error(`No asset found for the entity ${morphology?.id}`);
  }
  const { data, isLoading, error } = useQuery({
    queryKey: keyBuilder.asset({
      assetId: asset.id,
      entityId: morphology.id,
      assetType: EntityTypeDict.CellMorphology,
      context: ctx,
    }),
    queryFn: () =>
      downloadAsset<ArrayBuffer>({
        entityType: EntityTypeDict.CellMorphology,
        entityId: morphology.id,
        id: asset.id,
        ctx,
      }),
  });

  const decoder = new TextDecoder('utf-8');
  const result = data ? decoder.decode(data) : null;

  return {
    error,
    result,
    isLoading,
  };
}
