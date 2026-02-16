import {
  createCellMorphology,
  deleteCellMorphology,
  getCellMorphologies,
  getCellMorphology,
} from '@/api/entitycore/queries/experimental/cell-morphology';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { DetailViewSectionsDict } from '@/entity-configuration/definitions/types';
import { ViewsDefinitionRegistry } from '@/entity-configuration/definitions/view-defs';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import type {
  ICellMorphology,
  ICellMorphologyExpanded,
} from '@/api/entitycore/types/entities/cell-morphology';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';

export const CellMorphology: EntityCoreTypeConfig<ICellMorphology | ICellMorphologyExpanded> = {
  group: EntityTypeGroup.Experimental,
  title: 'Morphology',
  extendedType: ExtendedEntitiesTypeDict.CellMorphology,
  type: EntityTypeDict.CellMorphology,
  slug: EntitySlug.CellMorphology,
  api: {
    config: {
      allowedFacets: true,
      ilikeSearchEnabled: true,
    },
    query: {
      list: getCellMorphologies,
      one: getCellMorphology,
      delete: deleteCellMorphology,
      create: createCellMorphology,
    },
  },
  explore: {
    basePrefix: 'experimental',
    routePrefix: 'interactive/experimental',
  },
  asset: {
    extension: 'application/swc',
  },
  viewDefinition: ViewsDefinitionRegistry[ExtendedEntitiesTypeDict.CellMorphology],
  detailViewSections: [DetailViewSectionsDict.Overview],
  isDownloadable: true,
  isBookmarkable: true,
  isCopyable: true,
  isDeletable: true,
  isSimulatable: false,
  isUploadable: true,
} as const;
