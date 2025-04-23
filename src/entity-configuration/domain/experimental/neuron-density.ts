import { DataType } from '@/constants/explore-section/list-views';
import { EntityTypeEnum } from '@/api/entitycore/types/entity-type';
import * as entitycore from '@/api/entitycore/queries';

import type { IExperimentalNeuronDensity } from '@/api/entitycore/types/entities/neuron-density';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';

export const NeuronDensity: EntityCoreTypeConfig<IExperimentalNeuronDensity> = {
  group: 'experimental',
  legacyType: DataType.ExperimentalNeuronDensity,
  type: EntityTypeEnum.ExperimentalNeuronDensity,
  slug: 'neuron-density',
  api: {
    config: {
      allowedFacets: true,
      allowedParams: 'all',
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
