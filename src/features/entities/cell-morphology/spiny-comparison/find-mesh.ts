'use client';

import { useQuery } from '@tanstack/react-query';

import { getEmCellMesh, getEmCellMeshes } from '@/api/entitycore/queries/experimental/em-cell-mesh';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { meshAsset } from '@/features/entities/em-cell-mesh/viewer/mesh-asset';

import type { ICellMorphology } from '@/api/entitycore/types/entities/cell-morphology';
import type {
  IEMCellMesh,
  IEmCellMeshQueryFilters,
} from '@/api/entitycore/types/entities/em-cell-mesh';
import type { IAsset } from '@/api/entitycore/types/shared/global';
import type { WorkspaceContext } from '@/types/common';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** A segmentation's cell id, as MICrONS and H01 write them: nine digits or more. */
const CELL_ID = /\b(\d{9,20})\b/;

/** A morphology's spiny H5, which skeletonization registers as morphology_with_spines when it segments spines. */
export function spinyAsset(morphology: Pick<ICellMorphology, 'assets'>): IAsset | null {
  return morphology.assets?.find((a) => a.label === AssetLabel.morphology_with_spines) ?? null;
}

/**
 * What a morphology says of the EM mesh it was made from: the skeletonization workflow names it after the mesh's id; and
 * its name or description may carry the cell's id in its segmentation ("MICrONS neuron 864691136330101226", "… of
 * neuron 864691136330101226"), kept as digits, as the ids are past what a number holds exactly.
 */
export function meshHints(morphology: Pick<ICellMorphology, 'name' | 'description'>): {
  meshId: string | null;
  cellId: string | null;
} {
  const name = morphology.name?.trim() ?? '';
  const cell = CELL_ID.exec(name) ?? CELL_ID.exec(morphology.description ?? '');
  return { meshId: UUID.test(name) ? name : null, cellId: cell ? cell[1] : null };
}

export interface MeshForMorphology {
  id: string;
  name: string;
  asset: IAsset;
}

function withGlb(mesh: IEMCellMesh | null | undefined): MeshForMorphology | null {
  const asset = meshAsset(mesh?.assets);
  return mesh && asset ? { id: mesh.id, name: mesh.name, asset } : null;
}

/**
 * The EM mesh a spiny morphology was made from, with a GLB the EM viewer can load: the mesh it is named after, or else
 * the first of its cell's meshes. Null where there is none, or the morphology has no spiny H5.
 */
export async function findMeshFor(
  morphology: Pick<ICellMorphology, 'name' | 'description' | 'assets'>,
  context: WorkspaceContext | null
): Promise<MeshForMorphology | null> {
  if (!spinyAsset(morphology)) return null;
  const { meshId, cellId } = meshHints(morphology);
  if (meshId) {
    const named = await getEmCellMesh({ id: meshId, context }).catch(() => null);
    const found = withGlb(named);
    if (found) return found;
  }
  if (!cellId) return null;
  const meshes = await getEmCellMeshes({
    // as digits: the id is past what a number holds exactly
    filters: {
      dense_reconstruction_cell_id: cellId,
      page_size: 10,
    } as unknown as IEmCellMeshQueryFilters,
    context,
  }).catch(() => null);
  for (const mesh of meshes?.data ?? []) {
    const found = withGlb(mesh);
    if (found) return found;
  }
  return null;
}

export function useMeshForMorphology(
  morphology: ICellMorphology,
  context: WorkspaceContext | null
) {
  return useQuery({
    queryKey: ['spiny-morphology-mesh', morphology.id, context?.projectId ?? null],
    queryFn: () => findMeshFor(morphology, context),
    enabled: !!spinyAsset(morphology),
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });
}
