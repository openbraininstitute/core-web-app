import { getEModel, getEModels } from '@/api/entitycore/queries/model/e-model';
import { EntityTypeEnum } from '@/api/entitycore/types/entity-type';
import { DataType } from '@/constants/explore-section/list-views';

import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import type { IEModel } from '@/api/entitycore/types/entities/e-model';

export const Emodel: EntityCoreTypeConfig<IEModel> = {
  group: 'models',
  title: 'E-model',
  legacyType: DataType.CircuitEModel,
  type: EntityTypeEnum.Emodel,
  slug: 'e-model',
  api: {
    config: {
      allowedFacets: true,
      allowedParams: 'all',
    },
    query: {
      list: getEModels,
      one: getEModel,
    },
  },
  explore: {
    basePrefix: 'model',
    routePrefix: 'interactive/model',
  },
  asset: {
    extension: undefined,
  },
} as const;
