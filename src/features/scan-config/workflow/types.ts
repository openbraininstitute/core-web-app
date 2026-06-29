import type { ReactNode } from 'react';
import type { TTaskActivityType } from '@/api/entitycore/types/entities/task-activity';
import type { TTaskConfigType } from '@/api/entitycore/types/entities/task-config';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TObiOneTaskType } from '@/api/one/types/task';
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
import type { Nullish } from '@/utils/type';

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

export type TWorkflowTaskTypeBindings = {
  /** obi-one task type submitted to `/declared/task/launch` for executions */
  obiOne: TObiOneTaskType;
  /** entitycore activity type for the generate-grid config-generation step */
  configGeneration: TTaskActivityType;
  /** entitycore activity type for execution runs */
  execution: TTaskActivityType;
  /** entitycore task-config type for the generated configs */
  config: TTaskConfigType;
};

/**
 * entity-based resolver form of {@link TWorkflowTaskTypeBindings}: lets a workflow compute its bindings from the
 * resolved source entity (e.g. simulate picks the obi-one type from a circuit's `target_simulator`)
 */
export type TWorkflowTaskTypeBindingsResolver = (args: {
  entity: TSupportedEntitiesForScanConfiguration | Nullish;
}) => TWorkflowTaskTypeBindings;

/** a workflow declares its task bindings as a static object or a resolver. */
export type TWorkflowTaskTypeBindingsInput =
  | TWorkflowTaskTypeBindings
  | TWorkflowTaskTypeBindingsResolver;

/** resolves a workflow's `taskTypeBindings` (static or resolver fn) against the source entity */
export function resolveWorkflowTaskTypeBindings(
  input: TWorkflowTaskTypeBindingsInput | undefined,
  args: { entity: TSupportedEntitiesForScanConfiguration | Nullish }
): TWorkflowTaskTypeBindings | undefined {
  if (!input) return undefined;
  return typeof input === 'function' ? input(args) : input;
}

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
  /** obi-one + entitycore task identifiers used by the workflow's results tab (launch + polling) */
  taskTypeBindings?: TWorkflowTaskTypeBindingsInput;
};

export type TResolvedScanConfigEntity = {
  entity: TSupportedEntitiesForScanConfiguration | null;
  entityType: TExtendedEntitiesTypeDict;
  entityId?: string;
  workflowSessionId?: string;
  workflowSessionSelection?: TWorkflowSessionSelectionPayload | null;
};

export type TResolvedScanConfigCampaign = {
  origin?: string;
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
