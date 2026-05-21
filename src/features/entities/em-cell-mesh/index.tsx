import { getEmCellMesh } from '@/api/entitycore/queries/experimental/em-cell-mesh';
import { ReconstructionMetadata } from '@/features/entities/em-cell-mesh/reconstruction-metadata';
import { StructuralMetadata } from '@/features/entities/em-cell-mesh/structural-metadata';
import type { DetailViewVariant } from '@/ui/segments/detail-view/variant-styles';
import type { WorkspaceContext } from '@/types/common';

export async function EmCellMeshMetadata({
  id,
  ctx,
  variant = 'light',
}: {
  id: string;
  ctx: WorkspaceContext;
  variant?: DetailViewVariant;
}) {
  const emCellMeshes = await getEmCellMesh({ id, context: ctx });
  return (
    <div className="w-full pb-10">
      <StructuralMetadata />
      <ReconstructionMetadata entity={emCellMeshes} variant={variant} />
    </div>
  );
}
