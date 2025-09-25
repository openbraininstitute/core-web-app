import { ViewsDefinitionRegistry } from '@/entity-configuration/definitions/view-defs';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { EntitySlug } from '@/entity-configuration/domain/slug';
import {
  getCellMorphologies,
  getCellMorphology,
} from '@/api/entitycore/queries/experimental/cell-morphology';

import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import type {
  ICellMorphologyExpanded,
  ICellMorphology,
} from '@/api/entitycore/types/entities/cell-morphology';

export const CellMorphology: EntityCoreTypeConfig<ICellMorphology | ICellMorphologyExpanded> = {
  group: EntityTypeGroup.Experimental,
  title: 'Morphology',
  extendedType: ExtendedEntitiesTypeDict.CellMorphology,
  type: EntityTypeDict.CellMorphology,
  slug: EntitySlug.CellMorphology,
  api: {
    config: {
      allowedFacets: true,
    },
    query: {
      list: getCellMorphologies,
      one: getCellMorphology,
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
  detailViewSections: ['overview'],
  isDownloadable: true,
  isBookmarkable: true,
  isCopyable: true,
  isSimulatable: false,
} as const;
