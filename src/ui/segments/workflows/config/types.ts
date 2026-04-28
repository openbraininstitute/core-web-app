import type { ComponentType } from 'react';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { WorkflowActivityDictValue } from '@/constants';
import type { FlagKey } from '@/features/feature-flags/flags';

export const WorkflowSessionIdSearchParam = 'sessionId';

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
 * An entity the user must pick during the configuration step of a workflow.
 * A workflow can declare zero, one or many inputs.
 */
export type IWorkflowConfigurationInput = {
  type: TExtendedEntitiesTypeDict;
  label?: string;
  required?: boolean;
  multiple?: boolean;
  filters?: Record<string, unknown>;
};

export type IWorkflowDescriptor = {
  sourceType: TExtendedEntitiesTypeDict;
  targetType: TExtendedEntitiesTypeDict;
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
  /**
   * When `true`, the configuration flow first routes to a browse page
   * (`/workflows/<activity>/new/<kebab(targetType)>`) where the user picks
   * the primary `configurationInputs` entity before landing on the configure
   * page (`/workflows/<activity>/configure/<kebab(targetType)>/<id>`).
   *
   * When `false` or omitted, the configure page is opened directly.
   */
  needsBrowse?: boolean;
};

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
