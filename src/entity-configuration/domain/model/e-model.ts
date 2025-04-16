import { DataType } from '@/constants/explore-section/list-views';

import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';

export const Emodel: EntityCoreTypeConfig<any> = {
  group: 'models',
  legacyType: DataType.CircuitEModel,
  type: 'emodel',
  slug: 'e-model',
  api: {
    config: {
      allowedFacets: true,
      allowedParams: 'all',
    },
    query: {
      list: undefined,
      one: undefined,
    },
  },
  explore: {
    routePrefix: 'model',
  },
  asset: {
    extension: undefined,
  },
} as const;
