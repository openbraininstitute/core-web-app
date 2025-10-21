import { ViewsDefinitionRegistry } from '@/entity-configuration/definitions/view-defs';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { EntitySlug } from '@/entity-configuration/domain/slug';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import type { INotebook } from '@/api/entitycore/types/entities/notebook';
import { getNotebook, getNotebooks } from '@/api/entitycore/queries/notebook';

export const Notebook: EntityCoreTypeConfig<INotebook> = {
  group: EntityTypeGroup.Notebooks,
  title: 'Notebook',
  extendedType: ExtendedEntitiesTypeDict.Notebook,
  type: EntityTypeDict.Notebook,
  slug: EntitySlug.Notebook,
  api: {
    config: {
      allowedFacets: true,
    },
    query: {
      list: getNotebooks,
      one: getNotebook,
    },
  },
  viewDefinition: ViewsDefinitionRegistry[ExtendedEntitiesTypeDict.Notebook],
  isDownloadable: true,
  isBookmarkable: false,
  isCopyable: false,
  isSimulatable: false,
  isUploadable: false,
} as const;
