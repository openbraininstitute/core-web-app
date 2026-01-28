import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TEMCellMeshForm } from '@/ui/segments/contribute/em-cell-mesh/schema';
import { EMCellMeshSchema } from '@/ui/segments/contribute/em-cell-mesh/schema';
import { DEFAULT_LICENSE_ID } from '@/ui/segments/contribute/shared/schemas';
import type {
  IContributionFormConfig,
  IContributionStep,
} from '@/ui/segments/contribute/shared/types';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';

export const EM_CELL_MESH_PROGRESS_STEPS = [
  { key: 'em-cell-mesh', label: 'Creating Cell Mesh', mutationKey: 'createEMCellMesh' },
  { key: 'assets', label: 'Uploading Assets', mutationKey: 'createEMCellMeshAssets' },
  { key: 'contribution', label: 'Creating Contribution', mutationKey: 'createContribution' },
  {
    key: 'mtype-classification',
    label: 'Creating M-Type Classification',
    mutationKey: 'createMtypeClassification',
  },
];

const ZERO_UUID = '00000000-0000-4000-8000-000000000000';

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
        em_dense_reconstruction_dataset_id: ZERO_UUID,
        generation_method: 'marching_cubes',
      } as TEMCellMeshForm['setup'],
      contribution: [{}] as TEMCellMeshForm['contribution'],
      license_id: DEFAULT_LICENSE_ID,
      // Initialize assets to avoid uncontrolled input warnings
      assets: {
        obj: null,
      },
    }),
    buildDetailsUrl: ({ entityId, virtualLabId, projectId }) =>
      resolveExploreDetailsPageUrl({
        ctx: { virtualLabId, projectId },
        entityId,
        dataType: ExtendedEntitiesTypeDict.EMCellMesh,
      }),
  };
}
