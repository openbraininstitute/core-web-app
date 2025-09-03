// import { ViewsDefinitionRegistry } from '@/entity-configuration/definitions/view-defs';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { EntitySlug } from '@/entity-configuration/domain/slug';
import {
  getExperimentalBoutonDensities,
  getExperimentalBoutonDensity,
} from '@/api/entitycore/queries/experimental/bouton-density';

import type { IExperimentalBoutonDensity } from '@/api/entitycore/types/entities/bouton-density';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';

export const BoutonDensity: EntityCoreTypeConfig<IExperimentalBoutonDensity> = {
  group: EntityTypeGroup.Experimental,
  title: 'Bouton density',
  extendedType: ExtendedEntitiesTypeDict.ExperimentalBoutonDensity,
  type: EntityTypeDict.ExperimentalBoutonDensity,
  slug: EntitySlug.ExperimentalBoutonDensity,
  api: {
    config: {
      allowedFacets: true,
    },
    query: {
      list: getExperimentalBoutonDensities,
      one: getExperimentalBoutonDensity,
    },
  },
  explore: {
    basePrefix: 'experimental',
    routePrefix: 'interactive/experimental',
  },
  asset: {
    extension: 'application/json',
  },
  isBookmarkable: true,
  detailViewSections: ['overview'],
  isCopyable: true,
  isSimulatable: false,
} as const;
