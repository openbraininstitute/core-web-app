import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { spinyAsset } from '@/features/entities/cell-morphology/spiny-comparison/find-mesh';
import { meshAsset } from '@/features/entities/em-cell-mesh/viewer/mesh-asset';
import {
  ActivityCustomFileRenderer,
  type TSpinyComparisonFile,
} from '@/features/scan-config/types';

import type { ICellMorphology } from '@/api/entitycore/types/entities/cell-morphology';
import type { IEMCellMesh } from '@/api/entitycore/types/entities/em-cell-mesh';
import type { ITaskConfig } from '@/api/entitycore/types/entities/task-config';

/** What the comparison view's row is called among the outputs. */
export const SPINY_COMPARISON_NAME = 'Mesh, skeleton and spines';

/** The EM cell mesh a skeletonization config was made for: its input of that type, or its only input. */
export function inputMeshId(
  config: Pick<ITaskConfig<Record<string, unknown>>, 'inputs'>
): string | null {
  const inputs = config.inputs ?? [];
  const mesh = inputs.find((i) => i.type === EntityTypeDict.EMCellMesh);
  if (mesh) return mesh.id;
  return inputs.length === 1 && !inputs[0].type ? inputs[0].id : null;
}

export { spinyAsset };

/**
 * A comparison row for each morphology with a spiny H5, on the mesh it was made from, if that mesh has a GLB the EM
 * viewer can load.
 */
export function spinyComparisonFiles(
  mesh: Pick<IEMCellMesh, 'id' | 'name' | 'assets'> | null | undefined,
  morphologies: ICellMorphology[]
): TSpinyComparisonFile[] {
  const glb = meshAsset(mesh?.assets);
  if (!mesh || !glb) return [];
  return morphologies.flatMap((morphology) => {
    const h5 = spinyAsset(morphology);
    if (!h5) return [];
    return [
      {
        id: `spiny-comparison-${morphology.id}`,
        entity: morphology,
        name: SPINY_COMPARISON_NAME,
        renderer: ActivityCustomFileRenderer.SpinyComparison,
        mesh: { id: mesh.id, name: mesh.name, asset: glb },
        morphology: { id: morphology.id, asset: h5 },
      },
    ];
  });
}
