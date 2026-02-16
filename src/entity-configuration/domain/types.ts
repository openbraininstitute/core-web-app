import type { TEntityTypeDict } from '@/api/entitycore/types';
import type { TCircuitScaleDictionary } from '@/api/entitycore/types/entities/circuit';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type {
  AssetLabel,
  EntityCoreIdentifiable,
  EntityCoreIdentifiableNamed,
} from '@/api/entitycore/types/shared/global';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { TDetailViewSectionDict } from '@/entity-configuration/definitions/types';
import type { ViewDefinitionConfig } from '@/entity-configuration/definitions/view-defs/types';
import type { TEntityTypeGroup } from '@/entity-configuration/domain/group';
import type { EntitySlugValue } from '@/entity-configuration/domain/slug';
import type { FlagKey } from '@/features/feature-flags/flags';
import type { WorkspaceContext } from '@/types/common';

export type EntityCoreTypeConfig<T extends EntityCoreIdentifiable> = {
  group: TEntityTypeGroup;
  extendedType: TExtendedEntitiesTypeDict;
  type: TEntityTypeDict;
  slug: EntitySlugValue;
  title: string;
  alternateTitle?: string;
  requiredFeatures?: FlagKey[];
  api: {
    config: {
      allowedFacets?: boolean;
      extraRequiredListFilters?: Record<string, any>;
      ilikeSearchEnabled?: boolean;
    };
    query: {
      list?: (query: any) => Promise<EntityCoreResponse<T>>;
      count?: (query: any) => Promise<EntityCoreResponse<T>>;
      one: (query: { id: string; context?: WorkspaceContext | null }) => Promise<T>;
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
    ) => Promise<EntityCoreIdentifiableNamed | Array<EntityCoreIdentifiableNamed>>;
  };
  explore?: {
    basePrefix?: string;
    routePrefix?: string;
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
  isSimulatable?: boolean | ((scale: TCircuitScaleDictionary) => boolean);
  isUploadable?: boolean;
};

export type SerializedEntityCoreTypeConfig<T extends EntityCoreIdentifiable> = Omit<
  EntityCoreTypeConfig<T>,
  'api' | 'viewDefinition'
>;
