import type { TEntityTypeDict } from '@/api/entitycore/types';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { AssetLabel, EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { TDetailViewSectionDict } from '@/entity-configuration/definitions/types';
import type { ViewDefinitionConfig } from '@/entity-configuration/definitions/view-defs/types';
import type { TEntityTypeGroup } from '@/entity-configuration/domain/group';
import type { EntitySlugValue } from '@/entity-configuration/domain/slug';
import type {
  IEntityViewerConfig,
  IEntityViewerConfigSource,
} from '@/entity-configuration/domain/viewer-config';
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
  /**
   * The type is superseded by a newer implementation. Machine-readable counterpart of the
   * `(legacy)` suffix in {@link title}: the Data nav reads it to separate and de-emphasise
   * these entries. Mirrors `TEntityTypeMeta.legacy` on the workflow entity catalog.
   */
  legacy?: boolean;
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
  /**
   * Optional 3D / model-preview feature policy for this entity.
   *
   * Static {@link IEntityViewerConfig} or contextual
   * {@link IEntityViewerConfigSource}.
   * Resolved via {@link resolveEntityViewerConfig}; see
   * `@/entity-configuration/domain/viewer-config`.
   */
  viewer?: IEntityViewerConfig | IEntityViewerConfigSource;
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
