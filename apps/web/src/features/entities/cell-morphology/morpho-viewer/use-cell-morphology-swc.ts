import { useQuery } from '@tanstack/react-query';

import { downloadAsset } from '@/api/entitycore/queries/assets';
import { EntityTypeDict } from '@/api/entitycore/types';
import { keyBuilder } from '@/ui/use-query-keys/data';

import type { ICellMorphology } from '@/api/entitycore/types/entities/cell-morphology';
import type { WorkspaceContext } from '@/types/common';

const decoder = new TextDecoder('utf-8');
// Module-level: react-query runs `select` again whenever its identity changes, and an SWC can be megabytes.
const decodeSwc = (buffer: ArrayBuffer) => decoder.decode(buffer);

export function useCellMorphologySwc({
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
    select: decodeSwc,
  });

  return {
    error,
    result: data ?? null,
    isLoading,
  };
}
