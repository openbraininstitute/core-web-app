import { getMEModel, getMEModels, createMEModel } from '@/api/entitycore/queries/model/me-model';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import type { IMEModel } from '@/api/entitycore/types/entities/me-model';

export const MEmodel: EntityCoreTypeConfig<IMEModel> = {
  group: EntityTypeGroup.Models,
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
  detailViewSections: ['overview', 'analysis', 'configuration', 'related-artifacts'],
  isDownloadable: true,
  isBookmarkable: true,
  isCopyable: true,
  isSimulatable: true,
} as const;
