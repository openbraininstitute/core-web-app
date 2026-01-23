import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

import {
  ExperimentalBoutonDensitySchema,
  type TExperimentalBoutonDensityForm,
} from '@/ui/segments/contribute/experimental-bouton-density/schema';
import {
  DEFAULT_LICENSE_ID,
  type IContributionFormConfig,
  type IContributionStep,
} from '@/ui/segments/contribute/shared';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';

export const EXPERIMENTAL_BOUTON_DENSITY_PROGRESS_STEPS: Array<{
  key: string;
  label: string;
  mutationKey: string;
}> = [
  {
    key: 'experimental-bouton-density',
    label: 'Creating Experimental Bouton Density',
    mutationKey: 'createExperimentalBoutonDensity',
  },
  {
    key: 'contribution',
    label: 'Creating Contribution',
    mutationKey: 'createContribution',
  },
];

export function createExperimentalBoutonDensityConfig(
  steps: Array<IContributionStep<TExperimentalBoutonDensityForm>>
): IContributionFormConfig<TExperimentalBoutonDensityForm, typeof ExperimentalBoutonDensitySchema> {
  return {
    entityType: ExtendedEntitiesTypeDict.CellMorphology,
    title: 'Experimental Bouton Density',
    formId: 'contribute-experimental-bouton-density-modal',
    schema: ExperimentalBoutonDensitySchema,
    progressSteps: steps,
    getInitialValues: (brainRegionId: string) => ({
      setup: {
        brain_region_id: brainRegionId,
      } as TExperimentalBoutonDensityForm['setup'],
      contribution: [{}] as unknown as TExperimentalBoutonDensityForm['contribution'],
      measurements: [] as TExperimentalBoutonDensityForm['measurements'],
      license_id: DEFAULT_LICENSE_ID,
    }),
    buildDetailsUrl: ({ entityId, virtualLabId, projectId }) =>
      resolveExploreDetailsPageUrl({
        ctx: { virtualLabId, projectId },
        entityId,
        dataType: ExtendedEntitiesTypeDict.ExperimentalBoutonDensity,
      }),
  };
}
