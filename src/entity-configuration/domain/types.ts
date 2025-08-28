import type { ViewDefinitionConfig } from '@/entity-configuration/definitions/view-defs/types';
import type { AssetLabel, EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { EntitySlugValue } from '@/entity-configuration/domain/slug';
import type { DataType } from '@/constants/explore-section/list-views';
import type { EntityTypeValue } from '@/api/entitycore/types';
import type { WorkspaceContext } from '@/types/common';

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
    };
    query: {
      list?: (query: any) => Promise<EntityCoreResponse<T>>;
      one?: (query: { id: string; context?: WorkspaceContext | null }) => Promise<T>;
      create?: (query: any) => Promise<T>;
    };
    expand?: Record<string, (source: T, ctx?: WorkspaceContext, ...other: any) => Promise<any>>;
  };
  explore: {
    basePrefix?: string;
    routePrefix?: string;
  };
  asset: {
    extension?: string;
    configfile?: AssetLabel;
  };
  viewDefinition?: ViewDefinitionConfig | null;
  isBookmarkable: boolean;
  isDownloadable?: boolean;
  isCopyable?: boolean;
  isSimulatable?: boolean;
};

export type SerializedEntityCoreTypeConfig<T extends EntityCoreIdentifiable> = Omit<
  EntityCoreTypeConfig<T>,
  'api' | 'viewDefinition'
>;
