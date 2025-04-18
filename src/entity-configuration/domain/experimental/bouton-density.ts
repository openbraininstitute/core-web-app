import { DataType } from '@/constants/explore-section/list-views';
import { EntityType } from '@/entity-configuration/domain/types';
import * as entitycore from '@/api/entitycore/queries';

import type { IExperimentalBoutonDensity } from '@/api/entitycore/types/entities/bouton-density';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';

export const BoutonDensity: EntityCoreTypeConfig<IExperimentalBoutonDensity> = {
  group: 'experimental',
  legacyType: DataType.ExperimentalBoutonDensity,
  type: EntityType.ExperimentalBoutonDensity,
  slug: 'bouton-density',
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
    routePrefix: 'interactive/experimental',
  },
  asset: {
    extension: 'application/json',
  },
} as const;
