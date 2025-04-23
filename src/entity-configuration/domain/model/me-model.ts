import { getMEModel, getMEModels } from '@/api/entitycore/queries/model/me-model';
import { DataType } from '@/constants/explore-section/list-views';
import { EntityTypeEnum } from '@/api/entitycore/types/entity-type';

import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';

export const MEmodel: EntityCoreTypeConfig<any> = {
  group: 'models',
  legacyType: DataType.CircuitMEModel,
  type: EntityTypeEnum.Memodel,
  slug: 'me-model',
  api: {
    config: {
      allowedFacets: true,
      allowedParams: 'all',
    },
    query: {
      list: getMEModels,
      one: getMEModel,
    },
  },
  explore: {
    routePrefix: 'interactive/model',
  },
  asset: {
    extension: undefined,
  },
} as const;
