import type { EntityTypeValue } from '@/api/entitycore/types';
import type { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { DataType } from '@/constants/explore-section/list-views';
import type { ViewDefinitionConfig } from '@/entity-configuration/definitions/view-defs/types';

export type EntityCoreTypeConfig<T extends EntityCoreIdentifiable> = {
  group: 'experimental' | 'models' | 'simulations';
  legacyType?: DataType;
  type: EntityTypeValue;
  slug: string;
  api: {
    config: {
      allowedFacets?: boolean;
      allowedParams: 'all' | string[];
    };
    query: {
      list?: (query: any) => Promise<EntityCoreResponse<T>>;
      one?: (query: any) => Promise<any>;
    };
  };
  explore: {
    routePrefix?: string;
  };
  asset: {
    extension?: string;
  };
  viewDefinition?: ViewDefinitionConfig;
};
