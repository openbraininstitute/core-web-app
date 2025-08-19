import { getMEModel, getMEModels, createMEModel } from '@/api/entitycore/queries/model/me-model';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { EntitySlug } from '@/entity-configuration/domain/slug';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import type { IMEModel } from '@/api/entitycore/types/entities/me-model';

export const MEmodel: EntityCoreTypeConfig<IMEModel> = {
  group: 'models',
  title: 'ME-model',
  extendedType: ExtendedEntitiesTypeDict.Memodel,
  type: EntityTypeDict.Memodel,
  slug: EntitySlug.MeModel,
  api: {
    config: {
      allowedFacets: true,
    },
    query: {
      list: getMEModels,
      one: getMEModel,
      create: createMEModel,
    },
  },
  explore: {
    basePrefix: 'model',
    routePrefix: 'interactive/model',
  },
  asset: {
    extension: undefined,
  },
  isBookmarkable: true,
  bookmarkCategory: 'CircuitMEModel',
} as const;
