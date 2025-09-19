import { ViewsDefinitionRegistry } from '@/entity-configuration/definitions/view-defs';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
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
  group: EntityTypeGroup.Experimental,
  title: 'Morphology',
  extendedType: ExtendedEntitiesTypeDict.ReconstructionMorphology,
  type: EntityTypeDict.ReconstructionMorphology,
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
  viewDefinition: ViewsDefinitionRegistry[ExtendedEntitiesTypeDict.ReconstructionMorphology],
  detailViewSections: ['overview'],
  isDownloadable: true,
  isBookmarkable: true,
  isCopyable: true,
  isSimulatable: false,
} as const;
