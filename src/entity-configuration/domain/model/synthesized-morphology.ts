import {
  getCellMorphologies,
  getCellMorphology,
} from '@/api/entitycore/queries/experimental/cell-morphology';
import { CellMorphologyGenerationTypeDictionary } from '@/api/entitycore/types/entities/cell-morphology-protocol';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { DetailViewSectionsDict } from '@/entity-configuration/definitions/types';
import { ViewsDefinitionRegistry } from '@/entity-configuration/definitions/view-defs';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import type {
  CellMorphologyFilter,
  ICellMorphology,
  ICellMorphologyExpanded,
} from '@/api/entitycore/types/entities/cell-morphology';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';

export const protocolTypeFilter = {
  cell_morphology_protocol__generation_type__in: [
    CellMorphologyGenerationTypeDictionary.ComputationallySynthesized,
    CellMorphologyGenerationTypeDictionary.ModifiedReconstruction,
    CellMorphologyGenerationTypeDictionary.Placeholder,
  ],
};

function narrowFilters(filters?: CellMorphologyFilter) {
  return {
    ...filters,
    ...protocolTypeFilter,
  };
}

export const SynthesizedCellMorphology: EntityCoreTypeConfig<
  ICellMorphology | ICellMorphologyExpanded
> = {
  group: EntityTypeGroup.Models,
  title: 'Synthesized morphology',
  extendedType: ExtendedEntitiesTypeDict.SynthesizedCellMorphology,
  type: EntityTypeDict.CellMorphology,
  slug: EntitySlug.CellMorphology,
  api: {
    config: {
      allowedFacets: true,
      ilikeSearchEnabled: true,
      extraQueryKeyBuilder: { ...protocolTypeFilter },
    },
    query: {
      list: (...params) => {
        const mergedFilters = narrowFilters(params[0].filters);
        return getCellMorphologies({
          ...params,
          context: params[0].context,
          withFacets: params[0].withFacets,
          filters: mergedFilters,
        });
      },
      one: getCellMorphology,
    },
  },
  asset: { extension: 'application/swc' },
  viewDefinition: ViewsDefinitionRegistry[ExtendedEntitiesTypeDict.CellMorphology],
  detailViewSections: [DetailViewSectionsDict.Overview],
  isDownloadable: true,
  isBookmarkable: true,
  isCopyable: true,
  isSimulatable: false,
  // this is a subtype, only universal should be uploadable
  // link: src/entity-configuration/domain/experimental/universal-cell-morphology.ts
  isContributable: false,
  isSingleContributeSupport: false,
  isMultipleContributeSupport: false,
} as const;
