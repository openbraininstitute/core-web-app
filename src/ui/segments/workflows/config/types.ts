import type { ComponentType } from 'react';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { WorkflowActivityDictValue } from '@/constants';
import type { FlagKey } from '@/features/feature-flags/flags';
import type { SchemaName } from '@/features/scan-config/types';
import type { TScanConfigWorkflowDefinition } from '@/features/scan-config/workflow/types';
import type { TWorkflowSchemaSelection } from '@/features/scan-config/workflow/workflow-schema-selection';
import type { TScanConfigConfigureBinding } from './scan-config-binding';

export const WORKFLOW_SESSION_ID_SEARCH_PARAM = 'session';

export const WorkflowConfigureRoutingDict = {
  Session: 'session',
  Standalone: 'standalone',
} as const;

export type TWorkflowConfigureRouting =
  (typeof WorkflowConfigureRoutingDict)[keyof typeof WorkflowConfigureRoutingDict];

export const EntityGroupDict = {
  Subcellular: 'Subcellular',
  Cellular: 'Cellular',
  Circuit: 'Circuit',
  System: 'System',
} as const;

export type TEntityGroupValue = (typeof EntityGroupDict)[keyof typeof EntityGroupDict];

export type TActivityValue =
  (typeof WorkflowActivityDictValue)[keyof typeof WorkflowActivityDictValue];

/**
 * How the workflow picks the first route segment (`new` vs `configure`).
 *
 * - `configure`: open configure directly (legacy static workflows).
 * - `browse`: always open `/new` entity browse first (legacy browse-first workflows).
 * - `schema`: `new` vs `configure` is resolved from the ObiOne scan-config schema
 *   `initialize` block (`model_identifier` / `model_identifier_multiple`) in step 2+.
 */
export const WorkflowInitialStagePolicyDict = {
  Configure: 'configure',
  Browse: 'browse',
  Schema: 'schema',
} as const;

export type TWorkflowInitialStagePolicy =
  (typeof WorkflowInitialStagePolicyDict)[keyof typeof WorkflowInitialStagePolicyDict];

/**
 * Presentation metadata for an extended entity type. Used for labels, grouping,
 * tooltips and filters — independent of any activity.
 */
export type TEntityTypeMeta = {
  value: TExtendedEntitiesTypeDict;
  group: TEntityGroupValue;
  label: string;
  title?: string;
  description?: string;
  tags?: readonly string[];
  icon?: ComponentType;
  requiredFeatures?: readonly FlagKey[];
};

/**
 * Browse-table metadata for `/workflows/{activity}/new/{targetType}`.
 * Does not drive single vs multiple selection — that comes from the remote schema.
 */
export type IWorkflowConfigurationInput = {
  type: TExtendedEntitiesTypeDict;
  label?: string;
  required?: boolean;
  filters?: Record<string, unknown>;
};

export type IWorkflowDescriptor = {
  sourceType: TExtendedEntitiesTypeDict;
  targetType: TExtendedEntitiesTypeDict;
  /**
   * When `true`, the workflow accepts more than one entity type as input on `/new`.
   * `sourceType` and `targetType` are still the same campaign type; accepted input
   * types come from the scan-config schema (not from {@link configurationInputs}).
   */
  hasMultipleSources?: boolean;
  /** first route segment after choosing this workflow on the workflow */
  initialStage: TWorkflowInitialStagePolicy;
  /** when true, configure UI and schema-driven routing use scan-config */
  isScanConfig: boolean;
  /** scan-config configure binding; required when {@link isScanConfig} is true */
  scanConfig?: {
    definition: TScanConfigWorkflowDefinition;
    /** ObiOne JSON schema used for `initialize` selection rules and the editor */
    schemaName: SchemaName;
    /** Browse type, API entity type, FromID mapping, and generated grid endpoint */
    configureBinding: TScanConfigConfigureBinding;
  };
  /**
   * Optional browse-table entity types, labels, and filters.
   * Not used to decide single vs multiple selection (schema only).
   */
  configurationInputs?: readonly IWorkflowConfigurationInput[];
  label?: string;
  description?: string;
  tags?: readonly string[];
  filters?: Record<string, unknown>;
  disabled?: boolean;
  order?: number;
  beta?: boolean;
  requiredFeatures?: readonly FlagKey[];
  /** when true, browse table shows species / brain region selector */
  requireSpecies?: boolean;
  /** when true, browse table shows workspace scope selector */
  requireScope?: boolean;
  /**
   * scan-config configure URL shape; defaults to {@link WorkflowConfigureRoutingDict.Session}.
   * {@link WorkflowConfigureRoutingDict.Standalone} skips persisting a browse selection.
   */
  configureRouting?: TWorkflowConfigureRouting;
};

/** Resolved route segment after choosing a workflow on the workflow or `/new` guard. */
export const WorkflowInitialStageDict = {
  New: 'new',
  Configure: 'configure',
} as const;

export type TWorkflowInitialStage =
  (typeof WorkflowInitialStageDict)[keyof typeof WorkflowInitialStageDict];

export type TResolvedWorkflowInitialStage = {
  stage: TWorkflowInitialStage;
  workflow: IWorkflowDescriptor | null;
  schemaSelection?: TWorkflowSchemaSelection | null;
};

/** shared {@link IWorkflowDescriptor} fragments for activity registry entries */
export const WorkflowStagePresets = {
  DirectConfigure: {
    initialStage: WorkflowInitialStagePolicyDict.Configure,
    isScanConfig: false,
  },
  BrowseFirst: {
    initialStage: WorkflowInitialStagePolicyDict.Browse,
    isScanConfig: false,
  },
  ScanConfig: {
    initialStage: WorkflowInitialStagePolicyDict.Schema,
    isScanConfig: true,
  },
  Disabled: {
    initialStage: WorkflowInitialStagePolicyDict.Configure,
    isScanConfig: false,
  },
} as const;

export const WorkflowBrowseDefaults = {
  requireSpecies: false,
  requireScope: false,
} as const satisfies Pick<IWorkflowDescriptor, 'requireSpecies' | 'requireScope'>;

export type TActivityEntry = {
  value: TActivityValue;
  label: string;
  name: string;
  order?: number;
  disabled?: boolean;
  requiredFeatures?: readonly FlagKey[];
  /** workflows available when configuring a new run (the /workflows page). */
  workflows: readonly IWorkflowDescriptor[];
  /**
   * workflows presented when filtering past runs (the /activities page).
   * Defaults to `workflows` when omitted. Useful when the browsed entity type
   * differs from the configured one (e.g. Extract lists CircuitExtractionCampaign
   * while configuration targets Circuit).
   */
  browseWorkflows?: readonly IWorkflowDescriptor[];
};

export const WorkflowListContextDict = {
  Configure: 'configure',
  Browse: 'browse',
} as const;

export type TWorkflowListContext =
  (typeof WorkflowListContextDict)[keyof typeof WorkflowListContextDict];

export type ResolvedWorkflow = IWorkflowDescriptor & {
  entity: TEntityTypeMeta;
  disabled: boolean;
  label: string;
};

export type TGroupedWorkflows<T> = Array<{
  group: TEntityGroupValue;
  options: T[];
}>;

export const WorkflowListSortDict = {
  Order: 'order',
  None: 'none',
} as const;
export type TWorkflowListSort = (typeof WorkflowListSortDict)[keyof typeof WorkflowListSortDict];
