import { getEmCellMesh } from '@/api/entitycore/queries/experimental/em-cell-mesh';
import { type TViewVariant, ViewVariant } from '@/constants';
import { ReconstructionMetadata } from '@/features/entities/em-cell-mesh/reconstruction-metadata';
import { StructuralMetadata } from '@/features/entities/em-cell-mesh/structural-metadata';

import type { WorkspaceContext } from '@/types/common';

export async function EmCellMeshMetadata({
  id,
  ctx,
  variant = ViewVariant.Light,
}: {
  id: string;
  ctx: WorkspaceContext;
  variant?: TViewVariant;
}) {
  const emCellMeshes = await getEmCellMesh({ id, context: ctx });
  return (
    <div className="w-full pb-10">
      <StructuralMetadata />
      <ReconstructionMetadata entity={emCellMeshes} variant={variant} />
    </div>
  );
}
