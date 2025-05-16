import type { EntityTypeValue } from '@/api/entitycore/types';
import type { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { DataType } from '@/constants/explore-section/list-views';
import type { ViewDefinitionConfig } from '@/entity-configuration/definitions/view-defs/types';
import type { EntitySlugValue } from '@/entity-configuration/domain/slug';

export type EntityCoreTypeGroup = 'experimental' | 'models' | 'simulations';
export type EntityCoreTypeConfig<T extends EntityCoreIdentifiable> = {
  group: EntityCoreTypeGroup;
  legacyType: DataType;
  type: EntityTypeValue;
  slug: EntitySlugValue;
  title: string;
  api: {
    config: {
      allowedFacets?: boolean;
      allowedParams: 'all' | string[];
    };
    query: {
      list?: (query: any) => Promise<EntityCoreResponse<T>>;
      one?: (query: any) => Promise<T>;
      create?: (query: any) => Promise<T>;
    };
  };
  explore: {
    basePrefix?: string;
    routePrefix?: string;
  };
  asset: {
    extension?: string;
    configfile?: string;
  };
  viewDefinition?: ViewDefinitionConfig | null;
  isBookmarkable: boolean;
};

export type SerializedEntityCoreTypeConfig<T extends EntityCoreIdentifiable> = Omit<
  EntityCoreTypeConfig<T>,
  'api' | 'viewDefinition'
>;
