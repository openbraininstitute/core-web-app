import { DataType } from '@/constants/explore-section/list-views';
import * as entitycore from '@/api/entitycore/queries';

import type { IExperimentalNeuronDensity } from '@/api/entitycore/types/entities/neuron-density';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';

export const NeuronDensity: EntityCoreTypeConfig<IExperimentalNeuronDensity> = {
  group: 'experimental',
  legacyType: DataType.ExperimentalNeuronDensity,
  type: 'experimental-neuron-density',
  slug: 'neuron-density',
  api: {
    config: {
      allowedFacets: undefined,
      allowedParams: ['page_size', 'page'],
    },
    query: {
      list: entitycore.getExperimentalNeuronDensities,
      one: entitycore.getExperimentalNeuronDensity,
    },
  },
  explore: {
    routePrefix: 'interactive/experimental',
  },
  asset: {
    extension: 'application/json',
  },
} as const;
