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

export const cellMorphologyGenerationTypeFilter = {
  cell_morphology_protocol__generation_type__in: without(
    Object.values(CellMorphologyGenerationTypeDictionary),
    CellMorphologyGenerationTypeDictionary.ComputationallySynthesized,
    CellMorphologyGenerationTypeDictionary.ModifiedReconstruction
  ),
};

import { without } from 'es-toolkit/compat';

import { CellMorphologyGenerationTypeDictionary } from '@/api/entitycore/types/entities/cell-morphology-protocol';

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
      // extraQueryKeyBuilder: { ...cellMorphologyGenerationTypeFilter },
      ilikeSearchEnabled: true,
    },
    query: {
      list: (...params) => {
        return getCellMorphologies({
          ...params,
          context: params[0].context,
          withFacets: params[0].withFacets,
          filters: {
            ...params[0].filters,
            // ...cellMorphologyGenerationTypeFilter,
          },
        });
      },
      one: getCellMorphology,
      delete: deleteCellMorphology,
      create: createCellMorphology,
    },
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
  isContributable: true,
} as const;
