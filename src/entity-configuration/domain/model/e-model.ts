import { getEModel, getEModels } from '@/api/entitycore/queries/model/e-model';
import { getCellMorphology } from '@/api/entitycore/queries';
import { EntityTypeEnum } from '@/api/entitycore/types/entity-type';
import { DataType } from '@/constants/explore-section/list-views';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import type { IEModel } from '@/api/entitycore/types/entities/e-model';

export const Emodel: EntityCoreTypeConfig<IEModel> = {
  group: 'models',
  title: 'E-model',
  legacyType: DataType.CircuitEModel,
  type: EntityTypeEnum.Emodel,
  slug: EntitySlug.EModel,
  api: {
    config: {
      allowedFacets: true,
    },
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
  isBookmarkable: true,
  isDownloadable: true,
  isCopyable: true,
  isSimulatable: false,
} as const;
