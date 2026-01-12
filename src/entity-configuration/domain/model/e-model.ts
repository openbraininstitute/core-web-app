import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { DetailViewSectionsDict } from '@/entity-configuration/definitions/types';
import { getEModel, getEModels } from '@/api/entitycore/queries/model/e-model';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { EntitySlug } from '@/entity-configuration/domain/slug';
import { getCellMorphology } from '@/api/entitycore/queries';

import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import type { IEModel } from '@/api/entitycore/types/entities/e-model';

export const Emodel: EntityCoreTypeConfig<IEModel> = {
  group: EntityTypeGroup.Models,
  title: 'E-model',
  extendedType: ExtendedEntitiesTypeDict.Emodel,
  type: EntityTypeDict.Emodel,
  slug: EntitySlug.EModel,
  api: {
    config: { allowedFacets: true, ilikeSearchEnabled: true },
    query: {
      list: getEModels,
      one: getEModel,
    },
    expand: {
      exemplar_morphology: (source, ctx) =>
        getCellMorphology({ id: source.exemplar_morphology.id, context: ctx }),
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
  ],
  isDownloadable: true,
  isBookmarkable: true,
  isCopyable: true,
  isSimulatable: false,
} as const;
