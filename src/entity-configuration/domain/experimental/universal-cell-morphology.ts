import {
  createCellMorphology,
  deleteCellMorphology,
  getCellMorphologies,
  getCellMorphology,
} from '@/api/entitycore/queries/experimental/cell-morphology';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { CellMorphology as CellMorphologyConfig } from '@/entity-configuration/domain/experimental/cell-morphology';

import type {
  ICellMorphology,
  ICellMorphologyExpanded,
} from '@/api/entitycore/types/entities/cell-morphology';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';

export const UniversalCellMorphology: EntityCoreTypeConfig<
  ICellMorphology | ICellMorphologyExpanded
> = {
  ...CellMorphologyConfig,
  extendedType: ExtendedEntitiesTypeDict.UniversalCellMorphology,
  api: {
    config: {
      allowedFacets: true,
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
          },
        });
      },
      one: getCellMorphology,
      delete: deleteCellMorphology,
      create: createCellMorphology,
    },
  },
} as const;
