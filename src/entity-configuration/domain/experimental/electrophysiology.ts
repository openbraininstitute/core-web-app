import { DataType } from '@/constants/explore-section/list-views';
import { EntityType } from '@/entity-configuration/domain/types';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';

export const Electrophysiology: EntityCoreTypeConfig<any> = {
  group: 'experimental',
  legacyType: DataType.ExperimentalElectroPhysiology,
  type: EntityType.SingleCellExperimentalTrace,
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
