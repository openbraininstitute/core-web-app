import { ViewsDefinitionRegistry } from '@/entity-configuration/definitions/view-defs';
import { EntityTypeEnum } from '@/api/entitycore/types/entity-type';
import { DataType } from '@/constants/explore-section/list-views';
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
  group: 'experimental',
  title: 'Morphology',
  legacyType: DataType.ExperimentalNeuronMorphology,
  type: EntityTypeEnum.CellMorphology,
  slug: EntitySlug.ReconstructionMorphology,
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
  viewDefinition: ViewsDefinitionRegistry[DataType.ExperimentalNeuronMorphology],
  isBookmarkable: true,
  isDownloadable: true,
  isCopyable: true,
  isSimulatable: false,
} as const;
