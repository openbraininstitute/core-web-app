import type { QueryKey } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TScanConfigCampaignOriginActionDict } from '@/features/scan-config/helpers';
import type {
  Config,
  TScanConfigActivity,
  TScanConfigTabs,
  TSchemaMappingKey,
  TSupportedEntitiesForScanConfiguration,
} from '@/features/scan-config/types';
import type { TWorkflowSelectionPayload } from '@/features/scan-config/workflow/selection/types';
import type { WorkspaceContext } from '@/types/common';

export type TCampaignWithFormConfig = {
  config?: {
    form?: Config;
  };
};

export type TCampaignResolver<T extends TCampaignWithFormConfig = TCampaignWithFormConfig> =
  (args: { id: string; context: WorkspaceContext }) => Promise<T | null>;

export type TEntityRouteQuery<TEntity extends TSupportedEntitiesForScanConfiguration> = {
  queryKey: (args: { context: WorkspaceContext; id: string }) => QueryKey;
  queryFn: (args: { context: WorkspaceContext; id: string }) => Promise<TEntity>;
};

export const ScanConfigEntitySourceMode = {
  Session: 'session',
  StaticType: 'static-type',
} as const;
export type TScanConfigEntitySourceMode =
  (typeof ScanConfigEntitySourceMode)[keyof typeof ScanConfigEntitySourceMode];
/** How the configure step resolves its target entity(ies). */
export type TScanConfigEntitySource =
  | {
      mode: typeof ScanConfigEntitySourceMode.Session;
      /** Route param name for the workflow session id. Defaults to `id`. */
      param?: string;
      /** When set, loads the primary entity from the first ref in session selection. */
      query?: TEntityRouteQuery<TSupportedEntitiesForScanConfiguration>;
    }
  | {
      mode: typeof ScanConfigEntitySourceMode.StaticType;
      entityType: TExtendedEntitiesTypeDict;
    };

export type TScanConfigCampaignSource = {
  searchParam?: string;
  resolve: TCampaignResolver;
};

export type TScanConfigEditorOptions = {
  schemaMappingKey?: TSchemaMappingKey;
  defaultTab?: TScanConfigTabs;
  campaignOriginAction?: TScanConfigCampaignOriginActionDict;
  className?: string;
  readOnly?: boolean;
};

/** Declarative contract for a scan-config configure route. */
export type TScanConfigWorkflowDefinition = {
  id: string;
  activity: TScanConfigActivity;
  entity: TScanConfigEntitySource;
  campaign: TScanConfigCampaignSource;
  editor?: TScanConfigEditorOptions;
};

export type TResolvedScanConfigEntity = {
  entity: TSupportedEntitiesForScanConfiguration | null;
  entityType: TExtendedEntitiesTypeDict;
  entityId?: string;
  workflowSelection: TWorkflowSelectionPayload | null;
};

export type TResolvedScanConfigCampaign = {
  originId?: string;
  initialConfig?: Config;
  campaignData: TCampaignWithFormConfig | null | undefined;
  isLoading: boolean;
  error: Error | null;
  shouldRender: boolean;
};

export const ScanConfigWorkflowStatus = {
  Pending: 'pending',
  Ready: 'ready',
  Blocked: 'blocked',
} as const;

export type TScanConfigWorkflowStatus =
  (typeof ScanConfigWorkflowStatus)[keyof typeof ScanConfigWorkflowStatus];

export type TScanConfigWorkflowContextValue = {
  definition: TScanConfigWorkflowDefinition;
  workspace: WorkspaceContext;
  entity: TResolvedScanConfigEntity;
  campaign: TResolvedScanConfigCampaign;
  status: TScanConfigWorkflowStatus;
  editor: TScanConfigEditorOptions;
};

export type TScanConfigWorkflowPageProps = {
  definition: TScanConfigWorkflowDefinition;
  workspace: WorkspaceContext;
  searchParams: Record<string, string | string[] | undefined>;
  routeParams: Record<string, string | undefined>;
  /** override default frame + editor + aside layout */
  children?: ReactNode;
};

export type TCreateScanConfigWorkflowPageOptions = {
  aside?: ReactNode;
};
