import { getMEModel, getMEModels, createMEModel } from '@/api/entitycore/queries/model/me-model';
import { EntityTypeEnum } from '@/api/entitycore/types/entity-type';
import { EntitySlug } from '@/entity-configuration/domain/slug';
import { DataType } from '@/constants/explore-section/list-views';

import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import type { IMEModel } from '@/api/entitycore/types/entities/me-model';

export const MEmodel: EntityCoreTypeConfig<IMEModel> = {
  group: 'models',
  title: 'ME-model',
  legacyType: DataType.CircuitMEModel,
  type: EntityTypeEnum.Memodel,
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
  isDownloadable: true,
  isCopyable: true,
  isSimulatable: true,
} as const;
