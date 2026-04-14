import { getEmCellMesh, getEmCellMeshes } from '@/api/entitycore/queries/experimental/em-cell-mesh';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { DetailViewSectionsDict } from '@/entity-configuration/definitions/types';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import type { IEMCellMesh } from '@/api/entitycore/types/entities/em-cell-mesh';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';

export const EmCellMesh: EntityCoreTypeConfig<IEMCellMesh> = {
  group: EntityTypeGroup.Experimental,
  title: 'EM mesh',
  description:
    'An EM mesh is a neuroscientific artifact of a three-dimensional mesh reconstructed by electron microscopy, for example from scanning electron microscopy, where the data can be acquired down to ultrastructural detail.',
  extendedType: ExtendedEntitiesTypeDict.EMCellMesh,
  type: EntityTypeDict.EMCellMesh,
  slug: EntitySlug.EMCellMesh,
  api: {
    config: {
      allowedFacets: true,
      ilikeSearchEnabled: true,
    },
    query: {
      list: getEmCellMeshes,
      one: getEmCellMesh,
    },
  },
  asset: {},
  detailViewSections: [DetailViewSectionsDict.Overview],
  isDownloadable: true,
  isBookmarkable: true,
  isCopyable: true,
  isSimulatable: false,
  isContributable: true,
  isSingleContributeSupport: true,
  isMultipleContributeSupport: false,
  isDeletable: false,
} as const;
