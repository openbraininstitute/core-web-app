import type { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { DataType } from '@/constants/explore-section/list-views';
import type { ViewDefinitionConfig } from '@/entity-configuration/definitions/view-defs/types';

export type EntityCoreTypeConfig<T extends EntityCoreIdentifiable> = {
  group: 'experimental' | 'models' | 'simulations';
  legacyType?: DataType;
  type: string;
  slug: string;
  api: {
    config: {
      allowedFacets?: boolean;
      allowedParams: string | string[];
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
