import {
  getSingleNeuronSynaptome,
  getSingleNeuronSynaptomes,
  createSingleNeuronSynaptome,
  getSingleNeuronSynaptomeConfiguration,
} from '@/api/entitycore/queries/model/single-neuron-synaptome';
import { DataType } from '@/constants/explore-section/list-views';
import { EntityTypeEnum } from '@/api/entitycore/types/entity-type';
import { EntitySlug } from '@/entity-configuration/domain/slug';
import { getMEModel } from '@/api/entitycore/queries';

import type { ISingleNeuronSynaptome } from '@/api/entitycore/types/entities/single-neuron-synaptome';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';

export const SingleNeuronSynaptome: EntityCoreTypeConfig<ISingleNeuronSynaptome> = {
  group: 'models',
  title: 'Synaptome',
  legacyType: DataType.SingleNeuronSynaptome,
  type: EntityTypeEnum.SingleNeuronSynaptome,
  slug: EntitySlug.SingleNeuronSynaptome,
  api: {
    config: {
      allowedFacets: true,
      allowedParams: 'all',
    },
    query: {
      list: getSingleNeuronSynaptomes,
      one: getSingleNeuronSynaptome,
      create: createSingleNeuronSynaptome,
    },
    expand: {
      memodel: (source, context) => getMEModel({ id: source.me_model.id, context }),
      config: (source, context) => getSingleNeuronSynaptomeConfiguration({ source, context }),
    },
  },
  explore: {
    basePrefix: 'model',
    routePrefix: 'interactive/model',
  },
  asset: {
    extension: 'application/json',
    configfile: 'single_neuron_synaptome_config',
  },
  isBookmarkable: true,
} as const;
