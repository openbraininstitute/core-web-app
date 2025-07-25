import { ViewsDefinitionRegistry } from '@/entity-configuration/definitions/view-defs';
import { EntityTypeEnum } from '@/api/entitycore/types/entity-type';
import { DataType } from '@/constants/explore-section/list-views';
import { EntitySlug } from '@/entity-configuration/domain/slug';
import {
  getReconstructionMorphologies,
  getReconstructionMorphology,
} from '@/api/entitycore/queries/experimental/reconstruction-morphology';

import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import type {
  IReconstructionMorphologyExpanded,
  IReconstructionMorphology,
} from '@/api/entitycore/types/entities/reconstruction-morphology';

export const ReconstructionMorphology: EntityCoreTypeConfig<
  IReconstructionMorphology | IReconstructionMorphologyExpanded
> = {
  group: 'experimental',
  title: 'Morphology',
  legacyType: DataType.ExperimentalNeuronMorphology,
  type: EntityTypeEnum.ReconstructionMorphology,
  slug: EntitySlug.ReconstructionMorphology,
  api: {
    config: {
      allowedFacets: true,
    },
    query: {
      list: getReconstructionMorphologies,
      one: getReconstructionMorphology,
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
