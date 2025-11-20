import { FlagKey } from '@/features/feature-flags/flags';

import type { TEntityTypeDict } from '@/api/entitycore/types';
import type { TCircuitScaleDictionary } from '@/api/entitycore/types/entities/circuit';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { AssetLabel, EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { TDetailViewSectionDict } from '@/entity-configuration/definitions/types';
import type { ViewDefinitionConfig } from '@/entity-configuration/definitions/view-defs/types';
import type { TEntityTypeGroup } from '@/entity-configuration/domain/group';
import type { EntitySlugValue } from '@/entity-configuration/domain/slug';
import type { WorkspaceContext } from '@/types/common';

export type EntityCoreTypeConfig<T extends EntityCoreIdentifiable> = {
  group: TEntityTypeGroup;
  extendedType: TExtendedEntitiesTypeDict;
  type: TEntityTypeDict;
  slug: EntitySlugValue;
  title: string;
  alternateTitle?: string;
  requiredFeatures?: Array<FlagKey>;
  api: {
    config: {
      allowedFacets?: boolean;
    };
    query: {
      count?: (query: any) => Promise<EntityCoreResponse<T>>;
      list?: (query: any) => Promise<EntityCoreResponse<T>>;
      one: (query: { id: string; context?: WorkspaceContext | null }) => Promise<T>;
      create?: (body: any) => Promise<T>;
    };
    expand?: Record<string, (source: T, ctx?: WorkspaceContext, ...other: any) => Promise<any>>;
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
  isSimulatable: boolean | ((scale: TCircuitScaleDictionary) => boolean);
  isUploadable?: boolean;
};

export type SerializedEntityCoreTypeConfig<T extends EntityCoreIdentifiable> = Omit<
  EntityCoreTypeConfig<T>,
  'api' | 'viewDefinition'
>;
