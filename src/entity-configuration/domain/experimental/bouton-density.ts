import { DataType } from '@/constants/explore-section/list-views';
import * as entitycore from '@/api/entitycore/queries';

import type { IExperimentalBoutonDensity } from '@/api/entitycore/types/entities/bouton-density';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';

export const BoutonDensity: EntityCoreTypeConfig<IExperimentalBoutonDensity> = {
  group: 'experimental',
  legacyType: DataType.ExperimentalBoutonDensity,
  type: 'experimental-bouton-density',
  slug: 'bouton-density',
  api: {
    config: {
      allowedFacets: undefined,
      allowedParams: ['page_size', 'page'],
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
