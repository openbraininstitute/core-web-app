import type { TEntityTypeDict } from '@/api/entitycore/types';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { AssetLabel, EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { TDetailViewSectionDict } from '@/entity-configuration/definitions/types';
import type { ViewDefinitionConfig } from '@/entity-configuration/definitions/view-defs/types';
import type { TEntityTypeGroup } from '@/entity-configuration/domain/group';
import type { EntitySlugValue } from '@/entity-configuration/domain/slug';
import type { FlagKey } from '@/features/feature-flags/flags';
import type { WorkspaceContext } from '@/types/common';

export type TEntityConfigDiscriminatorFilter = {
  key: string;
  value: Array<string>;
};

export type EntityCoreTypeConfig<
  T extends EntityCoreIdentifiable,
  S = never, // single endpoint
  L = never, // List endpoint
> = {
  group: TEntityTypeGroup;
  extendedType: TExtendedEntitiesTypeDict;
  discriminator?: TEntityConfigDiscriminatorFilter;
  type: TEntityTypeDict;
  slug: EntitySlugValue;
  title: string;
  alternateTitle?: string;
  requiredFeatures?: FlagKey[];
  api: {
    config: {
      allowedFacets?: boolean;
      // this should be also passed to the query key builder to
      // include it in the query key (consistency and debugging)
      extraQueryKeyBuilder?: Record<string, any>;
      ilikeSearchEnabled?: boolean;
    };
    query: {
      list?: (query: any) => Promise<EntityCoreResponse<T> | L>;
      count?: (query: any) => Promise<number>;
      one: (
        query: {
          id: string;
          context?: WorkspaceContext | null;
          options?: {
            next?: NextFetchRequestConfig;
          };
        } & Record<string, any>
      ) => Promise<T>;
      resolve?: (
        query: {
          id: string;
          context?: WorkspaceContext | null;
        } & Record<string, any>
      ) => Promise<S>;
      status?: (
        query: {
          id: string;
          context?: WorkspaceContext | null;
        } & Record<string, any>
      ) => Promise<Map<string, number> | Record<string, unknown>>;
      create?: (body: any) => Promise<T>;
      delete?: (query: { id: string; context: WorkspaceContext | null }) => Promise<void>;
    };
    /**
     * Enriches a single entity with related data for detail view pages.
     * Called when viewing entity details (e.g., /entity/{id}).
     * Returns an object with multiple fields containing related data.
     *
     * Example: Fetch ME-model and synapse config for a synaptome detail page.
     */
    expand?: Record<string, (source: T, ctx?: WorkspaceContext, ...other: any) => Promise<any>>;
    /**
     * Fetches nested/child data for expandable table rows in list views.
     * Called on-demand when user clicks expand icon on a table row.
     * Returns an array of nested items to display in the expanded row.
     *
     * Example: Fetch simulations for a campaign when row is expanded.
     */
    expandRow?: (
      record: T,
      ctx?: WorkspaceContext
    ) => Promise<EntityCoreIdentifiable | Array<EntityCoreIdentifiable>>;
  };
  asset: {
    extension?: string;
    configfile?: AssetLabel;
  };
  viewDefinition?: ViewDefinitionConfig | null;
  isBookmarkable: boolean;
  detailViewSections?: TDetailViewSectionDict[];
  isDownloadable?: boolean;
  isCopyable?: boolean;
  isDeletable?: boolean;
  isSimulatable: boolean | ((entity: T) => boolean);
  isContributionOption?: boolean;
  isContributable?: boolean;
};

export type SerializedEntityCoreTypeConfig<T extends EntityCoreIdentifiable> = Omit<
  EntityCoreTypeConfig<T>,
  'api' | 'viewDefinition'
>;
