import { ViewsDefinitionRegistry } from '@/entity-configuration/definitions/view-defs';
import { EntityTypeEnum } from '@/api/entitycore/types/entity-type';
import { DataType } from '@/constants/explore-section/list-views';
import * as entitycore from '@/api/entitycore/queries';

import type {
  IReconstructionMorphologyExpanded,
  IReconstructionMorphology,
} from '@/api/entitycore/types/entities/reconstruction-morphology';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';

export const ReconstructionMorphology: EntityCoreTypeConfig<
  IReconstructionMorphology | IReconstructionMorphologyExpanded
> = {
  group: 'experimental',
  title: 'Morphology',
  legacyType: DataType.ExperimentalNeuronMorphology,
  type: EntityTypeEnum.ReconstructionMorphology,
  slug: 'morphology',
  api: {
    config: {
      allowedFacets: true,
      allowedParams: 'all',
    },
    query: {
      list: entitycore.getReconstructionMorphologies,
      one: entitycore.getReconstructionMorphology,
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
} as const;
