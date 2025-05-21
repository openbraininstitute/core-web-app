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
import { AssetLabel } from '@/api/entitycore/types/shared/global';

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
    basePrefix: 'simulate',
    routePrefix: 'simulate',
  },
  asset: {
    extension: 'application/json',
    configfile: AssetLabel.single_cell_simulation,
  },
} as const;
