import type { ComponentType } from 'react';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { WorkflowActivityDictValue } from '@/constants';
import type { FlagKey } from '@/features/feature-flags/flags';
import type { SchemaName } from '@/features/scan-config/types';
import type { TScanConfigWorkflowDefinition } from '@/features/scan-config/workflow/types';

export const WORKFLOW_SESSION_ID_SEARCH_PARAM = 'session';

export const EntityGroupDict = {
  Subcellular: 'Subcellular',
  Cellular: 'Cellular',
  Circuit: 'Circuit',
  System: 'System',
} as const;

export type TEntityGroupValue = (typeof EntityGroupDict)[keyof typeof EntityGroupDict];

export type TActivityValue =
  (typeof WorkflowActivityDictValue)[keyof typeof WorkflowActivityDictValue];

/** Pseudo source type when a workflow accepts multiple entity types via `configurationInputs`. */
export const WorkflowSelectionSourceTypeDict = {
  Multiple: 'multiple',
} as const;

export type TWorkflowSelectionSourceType =
  (typeof WorkflowSelectionSourceTypeDict)[keyof typeof WorkflowSelectionSourceTypeDict];

export type TWorkflowSourceType = TExtendedEntitiesTypeDict | TWorkflowSelectionSourceType;

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
 * An entity the user can pick on the workflow `/new` browse step.
 * Declare every allowed input type here, including per-type filters.
 * Table selection mode (radio vs checkbox) comes from the scan config schema.
 */
export type IWorkflowConfigurationInput = {
  type: TExtendedEntitiesTypeDict;
  label?: string;
  required?: boolean;
  multiple?: boolean;
  filters?: Record<string, unknown>;
};

/**
 * how the hub picks the first route segment (`new` browse vs `configure`).
 *
 * Configure: open configure directly
 * Browse: open `/new` entity browse first
 * Schema: `new` vs `configure` from scan-config schema `initialize` (single/multiple/grouped vs none)
 *
 */
export const WorkflowInitialStagePolicyDict = {
  /** skip entity browse; open configure directly */
  Configure: 'configure',
  /** always open `/new` entity browse first */
  Browse: 'browse',
  /** `new` vs `configure` from scan-config schema `initialize` (single/multiple/grouped vs none) */
  Schema: 'schema',
} as const;

export type TWorkflowInitialStagePolicy =
  (typeof WorkflowInitialStagePolicyDict)[keyof typeof WorkflowInitialStagePolicyDict];

/** how scan-config configure URLs are built (`session` = persist selection; `standalone` = route id only). */
export const WorkflowConfigureRoutingDict = {
  Session: 'session',
  Standalone: 'standalone',
} as const;

export type TWorkflowConfigureRouting =
  (typeof WorkflowConfigureRoutingDict)[keyof typeof WorkflowConfigureRoutingDict];

export type IWorkflowDescriptor = {
  sourceType: TWorkflowSourceType;
  targetType: TExtendedEntitiesTypeDict;
  /** first route segment after choosing this workflow on the hub */
  initialStage: TWorkflowInitialStagePolicy;
  /**
   * when set, overrides default session attachment on hub navigation
   * (default: attach when resolved stage is `new`)
   */
  attachSessionOnNavigate?: boolean;
  /**
   * when `true`, load ObiOne schema for browse selection mode and configure wiring
   * (via {@link IWorkflowDescriptor.scanConfig.schemaName}).
   */
  isScanConfig: boolean;
  /**
   * Entity type(s) the user must pick during the configuration step.
   * - Build workflows: usually empty (creating from scratch).
   * - Simulate workflows: typically `[{ type: <sourceType> }]` but can hold
   *   multiple inputs (e.g. a model + a stimulus protocol).
   * - Extract workflows: the entity to extract from (e.g. `Circuit`).
   *
   * If omitted, the configuration step does not require any entity selection.
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
  /** when true, browse table shows species / brain region selector. */
  requireSpecies: boolean;
  /** when true, browse table shows workspace scope selector. */
  requireScope: boolean;
  /** scan-config configure page binding when {@link isScanConfig} is true */
  scanConfig?: {
    definition: TScanConfigWorkflowDefinition;
    /** ObiOne JSON schema for browse `initialize` selection rules */
    schemaName: SchemaName;
  };
  /**
   * scan-config configure URL shape; defaults to {@link WorkflowConfigureRoutingDict.Session}.
   * {@link WorkflowConfigureRoutingDict.Standalone} skips persisting a browse selection (e.g. ion channel).
   */
  configureRouting?: TWorkflowConfigureRouting;
};

/** shared {@link IWorkflowDescriptor} fragments for activity registry entries */
export const WorkflowStagePresets = {
  DirectConfigure: {
    initialStage: WorkflowInitialStagePolicyDict.Configure,
    attachSessionOnNavigate: true,
  },
  BrowseFirst: {
    initialStage: WorkflowInitialStagePolicyDict.Browse,
    attachSessionOnNavigate: false,
  },
  ScanConfig: {
    initialStage: WorkflowInitialStagePolicyDict.Schema,
  },
  Disabled: {
    initialStage: WorkflowInitialStagePolicyDict.Configure,
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
