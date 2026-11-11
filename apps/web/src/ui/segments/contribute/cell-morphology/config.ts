import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { protocolTypeFilter } from '@/entity-configuration/domain';
import { CellMorphologySchema } from '@/ui/segments/contribute/cell-morphology/schema';
import { DEFAULT_LICENSE_ID } from '@/ui/segments/contribute/shared/schemas';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';

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

// "Morphology" (experimental) and "Synthesized morphology" (model) list the same entity type,
// split by the protocol's generation type, so the created entity belongs to whichever side
// matches its protocol.
const SYNTHESIZED_GENERATION_TYPES: ReadonlyArray<string> =
  protocolTypeFilter.cell_morphology_protocol__generation_type__in;

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
      contribution: [{}] as unknown as TCellMorphologyForm['contribution'],
      license_id: DEFAULT_LICENSE_ID,
    }),
    buildDetailsUrl: ({ entityId, virtualLabId, projectId, values }) =>
      resolveExploreDetailsPageUrl({
        ctx: { virtualLabId, projectId },
        entityId,
        dataType: SYNTHESIZED_GENERATION_TYPES.includes(values._protocol_generation_type ?? '')
          ? ExtendedEntitiesTypeDict.SynthesizedCellMorphology
          : ExtendedEntitiesTypeDict.CellMorphology,
      }),
  };
}
