import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

import {
  ExperimentalNeuronDensitySchema,
  type TExperimentalNeuronDensityForm,
} from '@/ui/segments/contribute/experimental-neuron-density/schema';
import {
  DEFAULT_LICENSE_ID,
  type IContributionFormConfig,
  type IContributionStep,
} from '@/ui/segments/contribute/shared';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';

export const EXPERIMENTAL_NEURON_DENSITY_PROGRESS_STEPS: Array<{
  key: string;
  label: string;
  mutationKey: string;
}> = [
  {
    key: 'experimental-neuron-density',
    label: 'Creating Experimental Neuron Density',
    mutationKey: 'createExperimentalNeuronDensity',
  },
  {
    key: 'etype-classification',
    label: 'Creating E-Type Classification',
    mutationKey: 'createEtypeClassification',
  },
  {
    key: 'mtype-classification',
    label: 'Creating M-Type Classification',
    mutationKey: 'createMtypeClassification',
  },
  {
    key: 'contribution',
    label: 'Creating Contribution',
    mutationKey: 'createContribution',
  },
];

export function createExperimentalNeuronDensityConfig(
  steps: Array<IContributionStep<TExperimentalNeuronDensityForm>>
): IContributionFormConfig<TExperimentalNeuronDensityForm, typeof ExperimentalNeuronDensitySchema> {
  return {
    entityType: ExtendedEntitiesTypeDict.CellMorphology,
    title: 'Experimental Neuron Density',
    formId: 'contribute-experimental-neuron-density-modal',
    schema: ExperimentalNeuronDensitySchema,
    progressSteps: steps,
    getInitialValues: (brainRegionId: string) => ({
      setup: { brain_region_id: brainRegionId } as TExperimentalNeuronDensityForm['setup'],
      contribution: [{}] as TExperimentalNeuronDensityForm['contribution'],
      measurements: [] as TExperimentalNeuronDensityForm['measurements'],
      license_id: DEFAULT_LICENSE_ID,
    }),
    buildDetailsUrl: ({ entityId, virtualLabId, projectId }) =>
      resolveExploreDetailsPageUrl({
        ctx: { virtualLabId, projectId },
        entityId,
        dataType: ExtendedEntitiesTypeDict.ExperimentalNeuronDensity,
      }),
  };
}
