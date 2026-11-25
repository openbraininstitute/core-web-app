import {
  EMCellMeshGenerationMethodDictionary,
  EMCellMeshTypeDictionary,
} from '@/api/entitycore/types/entities/em-cell-mesh';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { EMCellMeshSchema } from '@/ui/segments/contribute/em-cell-mesh/schema';
import { DEFAULT_LICENSE_ID } from '@/ui/segments/contribute/shared/schemas';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';

import type { TEMCellMeshForm } from '@/ui/segments/contribute/em-cell-mesh/schema';
import type {
  IContributionFormConfig,
  IContributionStep,
} from '@/ui/segments/contribute/shared/types';

export const EM_CELL_MESH_PROGRESS_STEPS = [
  {
    key: 'em-cell-mesh',
    label: 'Creating Cell Mesh',
    mutationKey: 'createEMCellMesh',
  },
  {
    key: 'assets',
    label: 'Uploading Assets',
    mutationKey: 'createEMCellMeshAssets',
  },
  {
    key: 'contribution',
    label: 'Creating Contribution',
    mutationKey: 'createContribution',
  },
  {
    key: 'mtype-classification',
    label: 'Creating M-Type Classification',
    mutationKey: 'createMtypeClassification',
  },
];

export function createEMCellMeshConfig(
  steps: IContributionStep<TEMCellMeshForm>[]
): IContributionFormConfig<TEMCellMeshForm, typeof EMCellMeshSchema> {
  return {
    entityType: ExtendedEntitiesTypeDict.EMCellMesh,
    title: 'Cell Morphology',
    formId: 'contribute-em-cell-mesh-modal',
    schema: EMCellMeshSchema,
    progressSteps: steps,
    getInitialValues: (brainRegionId: string) => ({
      setup: {
        brain_region_id: brainRegionId,
        generation_method: EMCellMeshGenerationMethodDictionary.MarchingCubes,
        mesh_type: EMCellMeshTypeDictionary.Static,
      } as TEMCellMeshForm['setup'],
      contribution: [{}] as unknown as TEMCellMeshForm['contribution'],
      license_id: DEFAULT_LICENSE_ID,
    }),
    buildDetailsUrl: ({ entityId, virtualLabId, projectId }) =>
      resolveExploreDetailsPageUrl({
        ctx: { virtualLabId, projectId },
        entityId,
        dataType: ExtendedEntitiesTypeDict.EMCellMesh,
      }),
  };
}
