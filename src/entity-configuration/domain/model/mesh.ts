import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';

const Mesh: EntityCoreTypeConfig<any> = {
  group: 'models',
  legacyType: undefined,
  type: 'mesh',
  slug: 'mesh',
  api: {
    config: {
      allowedFacets: undefined,
      allowedParams: ['page_size', 'page'],
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
    extension: 'application/json',
  },
} as const;
