import { getCircuit, getCircuits } from '@/api/entitycore/queries/model/circuit';
import { ExtendedEntitiesType } from '@/api/entitycore/types/extended-entity-type';
import { EntityTypeEnum } from '@/api/entitycore/types/entity-type';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';

export const Microcircuit: EntityCoreTypeConfig<ICircuit> = {
  group: 'models',
  title: 'Microcircuit',
  extendedType: ExtendedEntitiesType.Microcircuit,
  type: EntityTypeEnum.Circuit,
  slug: EntitySlug.Microcircuit,
  api: {
    config: {
      allowedFacets: true,
    },
    query: {
      list: (...params) =>
        getCircuits({
          ...params,
          filters: { ...params[0].filters, scale__in: ['microcircuit'] },
        }),
      one: getCircuit,
    },
  },
  explore: {
    basePrefix: 'model',
    routePrefix: 'interactive/model',
  },
  asset: {
    extension: 'application/json',
  },
  isBookmarkable: true,
} as const;
