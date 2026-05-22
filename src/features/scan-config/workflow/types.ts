import type { ReactNode } from 'react';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TScanConfigCampaignOriginActionDict } from '@/features/scan-config/helpers';
import type {
  Config,
  TScanConfigActivity,
  TScanConfigTabs,
  TSupportedEntitiesForScanConfiguration,
} from '@/features/scan-config/types';
import type { TWorkflowSessionSelectionPayload } from '@/features/scan-config/workflow/workflow-session-selection';
import type { WorkspaceContext } from '@/types/common';
import type { TScanConfigRegistryConfig } from '@/ui/segments/workflows/config/scan-config-binding';

export type TCampaignWithFormConfig = {
  config?: {
    form?: Config;
  };
};

export type TCampaignResolver<T extends TCampaignWithFormConfig = TCampaignWithFormConfig> =
  (args: { id: string; context: WorkspaceContext }) => Promise<T | null>;

export const ScanConfigEntitySourceMode = {
  StaticType: 'static-type',
  Session: 'session',
} as const;
export type TScanConfigEntitySourceMode =
  (typeof ScanConfigEntitySourceMode)[keyof typeof ScanConfigEntitySourceMode];

/** How the configure step resolves its target entity(ies). */
export type TScanConfigEntitySource =
  | {
      mode: typeof ScanConfigEntitySourceMode.StaticType;
      entityType: TExtendedEntitiesTypeDict;
    }
  | {
      mode: typeof ScanConfigEntitySourceMode.Session;
      /** Route param holding the workflow session id (`wf_…`). Defaults to `id`. */
      param?: string;
    };

export type TScanConfigCampaignSource = {
  searchParam?: string;
  resolve: TCampaignResolver;
};

export type TScanConfigEditorOptions = {
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
  workflowSessionSelection?: TWorkflowSessionSelectionPayload | null;
};

export type TResolvedScanConfigCampaign = {
  initialCampaignId?: string;
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
  scanConfig: TScanConfigRegistryConfig;
  workspace: WorkspaceContext;
  entity: TResolvedScanConfigEntity;
  campaign: TResolvedScanConfigCampaign;
  status: TScanConfigWorkflowStatus;
  editor: TScanConfigEditorOptions;
};

export type TScanConfigWorkflowPageProps = {
  definition: TScanConfigWorkflowDefinition;
  scanConfig: TScanConfigRegistryConfig;
  workspace: WorkspaceContext;
  routeParams: Record<string, string | undefined>;
  searchParams: Record<string, string | string[] | undefined>;
  /** Override default Frame + Editor + Aside layout. */
  children?: ReactNode;
};

export type TCreateScanConfigWorkflowPageOptions = {
  aside?: ReactNode;
};
