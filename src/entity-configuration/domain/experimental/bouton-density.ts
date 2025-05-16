// import { ViewsDefinitionRegistry } from '@/entity-configuration/definitions/view-defs';
import { EntityTypeEnum } from '@/api/entitycore/types/entity-type';
import { EntitySlug } from '@/entity-configuration/domain/slug';
import { DataType } from '@/constants/explore-section/list-views';
import * as entitycore from '@/api/entitycore/queries';

import type { IExperimentalBoutonDensity } from '@/api/entitycore/types/entities/bouton-density';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';

export const BoutonDensity: EntityCoreTypeConfig<IExperimentalBoutonDensity> = {
  group: 'experimental',
  title: 'Bouton density',
  legacyType: DataType.ExperimentalBoutonDensity,
  type: EntityTypeEnum.ExperimentalBoutonDensity,
  slug: EntitySlug.ExperimentalBoutonDensity,
  api: {
    config: {
      allowedFacets: true,
      allowedParams: 'all',
    },
    query: {
      list: entitycore.getExperimentalBoutonDensities,
      one: entitycore.getExperimentalBoutonDensity,
    },
  },
  explore: {
    basePrefix: 'experimental',
    routePrefix: 'interactive/experimental',
  },
  asset: {
    extension: 'application/json',
  },
  // viewDefinition: ViewsDefinitionRegistry[DataType.ExperimentalBoutonDensity],
  isBookmarkable: true,
} as const;
