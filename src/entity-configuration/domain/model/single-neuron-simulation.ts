import { DataType } from '@/constants/explore-section/list-views';
import { EntityTypeEnum } from '@/api/entitycore/types/entity-type';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import { ISingleNeuronSimulation } from '@/api/entitycore/types';
import {
  getSingleNeuronSimulation,
  getSingleNeuronSimulations,
  createSingleNeuronSimulation,
} from '@/api/entitycore/queries';

export const SingleNeuronSimulation: EntityCoreTypeConfig<ISingleNeuronSimulation> = {
  group: 'models',
  title: 'Single Neuron Simulation',
  legacyType: DataType.SingleNeuronSimulation,
  type: EntityTypeEnum.SingleNeuronSimulation,
  slug: EntitySlug.SingleNeuronSimulation,
  isBookmarkable: true,
  api: {
    config: {
      allowedFacets: true,
      allowedParams: 'all',
    },
    query: {
      list: getSingleNeuronSimulations,
      one: getSingleNeuronSimulation,
      create: createSingleNeuronSimulation,
    },
  },
  explore: {
    basePrefix: 'model',
    routePrefix: 'interactive/model',
  },
  asset: {
    extension: 'application/json',
    configfile: 'single_neuron_simulation_config',
  },
} as const;
