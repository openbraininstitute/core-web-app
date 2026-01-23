// config.ts

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { MeasurementUnit } from '@/api/entitycore/types/shared/global';

import {
  ExperimentalSynapsesPerConnectionSchema,
  type TExperimentalSynapsesPerConnectionForm,
} from '@/ui/segments/contribute/synapses-per-connection/schema';
import {
  DEFAULT_LICENSE_ID,
  type IContributionFormConfig,
  type IContributionStep,
} from '@/ui/segments/contribute/shared';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';

export const EXPERIMENTAL_SYNAPSES_PER_CONNECTION_PROGRESS_STEPS: Array<{
  key: string;
  label: string;
  mutationKey: string;
}> = [
  {
    key: 'synapses-per-connection',
    label: 'Creating Experimental Synpase Per Connection',
    mutationKey: 'createExperimentalSynapsesPerConnection',
  },
  {
    key: 'contribution',
    label: 'Creating Contribution',
    mutationKey: 'createContribution',
  },
];

export function createExperimentalSynapsesPerConnectionConfig(
  steps: Array<IContributionStep<TExperimentalSynapsesPerConnectionForm>>
): IContributionFormConfig<
  TExperimentalSynapsesPerConnectionForm,
  typeof ExperimentalSynapsesPerConnectionSchema
> {
  return {
    entityType: ExtendedEntitiesTypeDict.ExperimentalSynapsesPerConnection,
    title: 'Experimental Synapse Density',
    formId: 'contribute-synapses-per-connection-modal',
    schema: ExperimentalSynapsesPerConnectionSchema,
    progressSteps: steps,
    getInitialValues: () => ({
      contribution: [{}] as unknown as TExperimentalSynapsesPerConnectionForm['contribution'],
      measurements: [
        {
          name: undefined,
          unit: MeasurementUnit.dimensionless,
          value: undefined,
        },
      ] as TExperimentalSynapsesPerConnectionForm['measurements'],
      license_id: DEFAULT_LICENSE_ID,
      // pre_region and post_region will be set by the BrainRegionDropdown component
    }),
    buildDetailsUrl: ({ entityId, virtualLabId, projectId }) =>
      resolveExploreDetailsPageUrl({
        ctx: { virtualLabId, projectId },
        entityId,
        dataType: ExtendedEntitiesTypeDict.ExperimentalSynapsesPerConnection,
      }),
  };
}
