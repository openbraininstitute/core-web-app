import { getEmCellMesh } from '@/api/entitycore/queries/experimental/em-cell-mesh';
import type { WorkspaceContext } from '@/types/common';
import { ReconstructionMetadata } from './reconstruction-metadata';
import { StructuralMetadata } from './structural-metadata';

export async function EmCellMeshMetadata({ id, ctx }: { id: string; ctx: WorkspaceContext }) {
  const emCellMeshes = await getEmCellMesh({ id, context: ctx });
  return (
    <>
      <ReconstructionMetadata entity={emCellMeshes} />
      <StructuralMetadata />
    </>
  );
}
