import { getNotebook, getNotebooks } from '@/api/entitycore/queries/notebook';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { ViewsDefinitionRegistry } from '@/entity-configuration/definitions/view-defs';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import type { INotebook } from '@/api/entitycore/types/entities/notebook';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';

export const Notebook: EntityCoreTypeConfig<INotebook> = {
  group: EntityTypeGroup.Notebooks,
  title: 'Notebook',
  extendedType: ExtendedEntitiesTypeDict.Notebook,
  type: EntityTypeDict.Notebook,
  slug: EntitySlug.Notebook,
  api: {
    config: {
      allowedFacets: true,
      ilikeSearchEnabled: true,
    },
    query: {
      list: getNotebooks,
      one: getNotebook,
    },
  },
  asset: {},
  viewDefinition: ViewsDefinitionRegistry[ExtendedEntitiesTypeDict.Notebook],
  isDownloadable: true,
  isBookmarkable: false,
  isCopyable: false,
  isSimulatable: false,
  isContributable: false,
} as const;
