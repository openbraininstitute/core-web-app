import { createMEModel, getMEModel, getMEModels } from '@/api/entitycore/queries/model/me-model';
import type { IMEModel } from '@/api/entitycore/types/entities/me-model';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { DetailViewSectionsDict } from '@/entity-configuration/definitions/types';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { EntitySlug } from '@/entity-configuration/domain/slug';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';

export const MEmodel: EntityCoreTypeConfig<IMEModel> = {
  group: EntityTypeGroup.Models,
  title: 'ME-model',
  extendedType: ExtendedEntitiesTypeDict.Memodel,
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
