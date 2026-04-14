import {
  getExperimentalNeuronDensities,
  getExperimentalNeuronDensity,
} from '@/api/entitycore/queries/experimental/neuron-density';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { DetailViewSectionsDict } from '@/entity-configuration/definitions/types';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import type { IExperimentalNeuronDensity } from '@/api/entitycore/types/entities/neuron-density';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';

export const NeuronDensity: EntityCoreTypeConfig<IExperimentalNeuronDensity> = {
  group: EntityTypeGroup.Experimental,
  title: 'Neuron density',
  description:
    'Quantitative measure of the number of cell bodies (somas) present within a defined volume of brain tissue, typically expressed as neurons per cubic micrometer (\u00b5m^3). This metric could be used to study anatomical differences between brain areas and between species. It could also be used to determine the cell composition of excitatory versus inhibitory neurons in a region.',
  extendedType: ExtendedEntitiesTypeDict.ExperimentalNeuronDensity,
  type: EntityTypeDict.ExperimentalNeuronDensity,
  slug: EntitySlug.ExperimentalNeuronDensity,
  api: {
    config: {
      allowedFacets: true,
      ilikeSearchEnabled: true,
    },
    query: {
      list: getExperimentalNeuronDensities,
      one: getExperimentalNeuronDensity,
    },
  },
  asset: {
    extension: 'application/json',
  },
  detailViewSections: [DetailViewSectionsDict.Overview],
  isDownloadable: true,
  isBookmarkable: true,
  isCopyable: true,
  isSimulatable: false,
  isContributable: true,
  isSingleContributeSupport: true,
  isMultipleContributeSupport: false,
} as const;
