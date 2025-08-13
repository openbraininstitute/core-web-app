import { getCircuit, getCircuits } from '@/api/entitycore/queries/model/circuit';
import { ExtendedEntitiesType } from '@/api/entitycore/types/extended-entity-type';
import { EntityTypeEnum } from '@/api/entitycore/types/entity-type';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';

export const Circuit: EntityCoreTypeConfig<ICircuit> = {
  group: 'models',
  title: 'Circuit',
  extendedType: ExtendedEntitiesType.Circuit,
  type: EntityTypeEnum.Circuit,
  slug: EntitySlug.Circuit,
  api: {
    config: {
      allowedFacets: true,
    },
    query: {
      list: getCircuits,
      one: getCircuit,
    },
  },
  explore: {
    basePrefix: 'model',
    routePrefix: 'interactive/model',
  },
  asset: {
    extension: 'application/json',
    // configfile: AssetLabel.single_neuron_synaptome_config,
  },
  isBookmarkable: true,
} as const;
