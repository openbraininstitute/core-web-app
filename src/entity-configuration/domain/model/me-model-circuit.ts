import { getMEModel, getMEModels, createMEModel } from '@/api/entitycore/queries/model/me-model';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { DetailViewSectionsDict } from '@/entity-configuration/definitions/types';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import type { IMEModel } from '@/api/entitycore/types/entities/me-model';

export const MEModelCircuit: EntityCoreTypeConfig<IMEModel> = {
  group: EntityTypeGroup.Models,
  title: 'ME-model',
  extendedType: ExtendedEntitiesTypeDict.MemodelCircuit,
  type: EntityTypeDict.Memodel,
  slug: EntitySlug.MeModel,
  api: {
    config: {
      allowedFacets: true,
      ilikeSearchEnabled: true,
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
  detailViewSections: [
    DetailViewSectionsDict.Overview,
    DetailViewSectionsDict.Analysis,
    DetailViewSectionsDict.Configuration,
    DetailViewSectionsDict.RelatedArtifacts,
  ],
  isDownloadable: true,
  isBookmarkable: true,
  isCopyable: true,
  isSimulatable: true,
} as const;
