import { DataType } from '@/constants/explore-section/list-views';
import * as entitycore from '@/api/entitycore/queries';

import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';

export const Electrophysiology: EntityCoreTypeConfig<any> = {
  group: 'experimental',
  legacyType: DataType.ExperimentalElectroPhysiology,
  type: 'single-cell-experimental-trace',
  slug: 'electrophysiology',
  api: {
    config: {
      allowedFacets: undefined,
      allowedParams: ['page_size', 'page'],
    },
    query: {
      list: undefined,
      one: undefined,
    },
  },
  explore: {
    routePrefix: 'interactive/experimental',
  },
  asset: {
    extension: 'application/json',
  },
} as const;
