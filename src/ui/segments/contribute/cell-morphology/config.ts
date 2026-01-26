import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';

import { CellMorphologySchema } from '@/ui/segments/contribute/cell-morphology/schema';
import { DEFAULT_LICENSE_ID } from '@/ui/segments/contribute/shared/schemas';

import type { TCellMorphologyForm } from '@/ui/segments/contribute/cell-morphology/schema';
import type {
  IContributionFormConfig,
  IContributionStep,
} from '@/ui/segments/contribute/shared/types';

export const CELL_MORPHOLOGY_PROGRESS_STEPS: Array<{
  key: string;
  label: string;
  mutationKey: string;
}> = [
  {
    key: 'cell-morphology',
    label: 'Creating Cell Morphology',
    mutationKey: 'createCellMorphology',
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

export function createCellMorphologyConfig(
  steps: Array<IContributionStep<TCellMorphologyForm>>
): IContributionFormConfig<TCellMorphologyForm, typeof CellMorphologySchema> {
  return {
    entityType: ExtendedEntitiesTypeDict.CellMorphology,
    title: 'Cell Morphology',
    formId: 'contribute-cell-morphology-modal',
    schema: CellMorphologySchema,
    progressSteps: steps,
    getInitialValues: (brainRegionId: string) => ({
      setup: { brain_region_id: brainRegionId } as TCellMorphologyForm['setup'],
      contribution: [{}] as TCellMorphologyForm['contribution'],
      license_id: DEFAULT_LICENSE_ID,
    }),
    buildDetailsUrl: ({ entityId, virtualLabId, projectId }) =>
      resolveExploreDetailsPageUrl({
        ctx: { virtualLabId, projectId },
        entityId,
        dataType: ExtendedEntitiesTypeDict.CellMorphology,
      }),
  };
}
