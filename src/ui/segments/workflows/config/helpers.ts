import groupBy from 'es-toolkit/compat/groupBy';
import sortBy from 'es-toolkit/compat/sortBy';

import { WorkspaceSection } from '@/constants';
import { fetchObiOneJsonSchema } from '@/features/scan-config/components/hooks/schema';
import {
  parseWorkflowSchemaSelection,
  type TWorkflowSchemaSelection,
  WorkflowSchemaSelectionMode,
} from '@/features/scan-config/workflow/workflow-schema-selection';

import { ActivityRegistry } from './activities';
import { EntityTypeCatalog } from './entity-types';
import {
  EntityGroupDict,
  type IWorkflowConfigurationInput,
  type IWorkflowDescriptor,
  type ResolvedWorkflow,
  type TActivityEntry,
  type TActivityValue,
  type TEntityGroupValue,
  type TEntityTypeMeta,
  type TGroupedWorkflows,
  type TResolvedWorkflowInitialStage,
  type TWorkflowBreadcrumbContext,
  type TWorkflowBreadcrumbNode,
  type TWorkflowBreadcrumbPhase,
  type TWorkflowInitialStage,
  type TWorkflowListContext,
  type TWorkflowListSort,
  WorkflowInitialStageDict,
  WorkflowInitialStagePolicyDict,
  WorkflowListContextDict,
  WorkflowListSortDict,
} from './types';

import type { QueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TWorkspaceSection } from '@/constants';
import type { FeatureFlags, FlagKey } from '@/features/feature-flags/flags';

const featuresSatisfied = (
  required: readonly FlagKey[] | undefined,
  flags: FeatureFlags | undefined
): boolean => {
  if (!required || required.length === 0) return true;
  if (!flags) return false;
  return required.every((flag) => Boolean(flags[flag]));
};

export function listActivities(flags?: FeatureFlags): TActivityEntry[] {
  const visibleActivities = Object.values(ActivityRegistry).filter((activity) =>
    featuresSatisfied(activity.requiredFeatures, flags)
  );

  return sortBy(visibleActivities, (activity) => activity.order ?? Number.MAX_SAFE_INTEGER);
}

export function getActivity(
  value: TActivityValue | string | null | undefined
): TActivityEntry | null {
  if (!value) return null;
  return (ActivityRegistry as Record<string, TActivityEntry | undefined>)[value] ?? null;
}

export function getEntityMeta(
  value: TExtendedEntitiesTypeDict | null | undefined
): TEntityTypeMeta | null {
  if (!value) return null;
  return EntityTypeCatalog[value] ?? null;
}

export function workflowHasMultipleSources(
  workflow: IWorkflowDescriptor | null | undefined
): boolean {
  return Boolean(workflow?.hasMultipleSources);
}

function resolveWorkflow(
  workflow: IWorkflowDescriptor,
  flags: FeatureFlags | undefined
): ResolvedWorkflow {
  const entity = EntityTypeCatalog[workflow.sourceType] ?? {
    value: workflow.sourceType,
    group: EntityGroupDict.Cellular,
    label: workflow.label ?? String(workflow.sourceType),
  };
  const entityFeaturesSatisfied = featuresSatisfied(entity.requiredFeatures, flags);
  const workflowFeaturesSatisfied = featuresSatisfied(workflow.requiredFeatures, flags);
  const disabled =
    Boolean(workflow.disabled) || !entityFeaturesSatisfied || !workflowFeaturesSatisfied;
  return {
    ...workflow,
    entity,
    disabled,
    label: workflow.label ?? entity.label,
  };
}

function workflowsFor(
  activity: TActivityEntry,
  context: TWorkflowListContext
): readonly IWorkflowDescriptor[] {
  if (context === WorkflowListContextDict.Browse)
    return activity.browseWorkflows ?? activity.workflows;
  return activity.workflows;
}

/**
 * list the workflows for an activity, resolved against the entity catalog and
 * feature flags, sorted by `order` (disabled last)
 */
export function listWorkflows(opts: {
  activity: TActivityValue | string | null | undefined;
  flags?: FeatureFlags;
  context?: TWorkflowListContext;
  sort?: TWorkflowListSort;
}): ResolvedWorkflow[] {
  const activity = getActivity(opts.activity);
  if (!activity) return [];
  if (activity.disabled) return [];
  if (!featuresSatisfied(activity.requiredFeatures, opts.flags)) return [];

  const source = workflowsFor(activity, opts.context ?? WorkflowListContextDict.Configure);

  const resolved = source.map((wf) => resolveWorkflow(wf, opts.flags));

  if (opts.sort === WorkflowListSortDict.Order) {
    return sortBy(resolved, [
      (o) => (o.disabled ? 1 : 0),
      (o) => o.order ?? Number.MAX_SAFE_INTEGER,
    ]);
  }

  return resolved;
}

/**
 * group a list of resolved workflows by the entity's group
 * (Subcellular, Cellular, Circuit, System).
 */
export function groupWorkflowsByEntityGroup<T extends { entity: TEntityTypeMeta }>(
  workflows: T[]
): TGroupedWorkflows<T> {
  const grouped = groupBy(workflows, (w) => w.entity.group);
  return Object.entries(grouped).map(([group, options]) => ({
    group: group as TEntityGroupValue,
    options,
  }));
}

export function getWorkflow(opts: {
  activity: TActivityValue | string | null | undefined;
  sourceType?: TExtendedEntitiesTypeDict;
  targetType?: TExtendedEntitiesTypeDict;
  context?: TWorkflowListContext;
}): IWorkflowDescriptor | null {
  const activity = getActivity(opts.activity);
  if (!activity) return null;
  const list = workflowsFor(activity, opts.context ?? 'configure');
  return (
    list.find((w) => {
      if (opts.sourceType && w.sourceType !== opts.sourceType) return false;
      if (opts.targetType && w.targetType !== opts.targetType) return false;
      return true;
    }) ?? null
  );
}

export {
  findScanConfigRegistryByDefinition,
  findScanConfigRegistryByTargetType,
} from './scan-config-registry';

export function getSourceType(opts: {
  activity: TActivityValue | string | null | undefined;
  targetType: TExtendedEntitiesTypeDict;
  context?: TWorkflowListContext;
}): TExtendedEntitiesTypeDict | undefined {
  return getWorkflow({
    activity: opts.activity,
    targetType: opts.targetType,
    context: opts.context,
  })?.sourceType;
}

export function getTargetType(opts: {
  activity: TActivityValue | string | null | undefined;
  sourceType: TExtendedEntitiesTypeDict;
  context?: TWorkflowListContext;
}): TExtendedEntitiesTypeDict | undefined {
  return getWorkflow({
    activity: opts.activity,
    sourceType: opts.sourceType,
    context: opts.context,
  })?.targetType;
}

/**
 * returns the list of entity types the user must pick at the configuration
 * step for the workflow identified by (activity, sourceType | targetType)
 */
export function getConfigurationInputs(opts: {
  activity: TActivityValue | string | null | undefined;
  sourceType?: TExtendedEntitiesTypeDict;
  targetType?: TExtendedEntitiesTypeDict;
  context?: TWorkflowListContext;
}): readonly IWorkflowConfigurationInput[] {
  return getWorkflow(opts)?.configurationInputs ?? [];
}

/**
 * Returns the primary configuration input (first required, falling back to
 * the first entry) for a workflow. Used by the pre-configure browse page to
 * decide which entity type to list and which filters to apply.
 */
export function getPrimaryConfigurationInput(opts: {
  activity: TActivityValue | string | null | undefined;
  sourceType?: TExtendedEntitiesTypeDict;
  targetType?: TExtendedEntitiesTypeDict;
  context?: TWorkflowListContext;
}): IWorkflowConfigurationInput | undefined {
  const inputs = getConfigurationInputs(opts);
  return inputs.find((i) => i.required !== false) ?? inputs[0];
}

const sectionToActivity: Partial<Record<TWorkspaceSection, TActivityValue>> = {
  [WorkspaceSection.BuildWorkflow]: WorkspaceSection.BuildWorkflow,
  [WorkspaceSection.SimulateWorkflow]: WorkspaceSection.SimulateWorkflow,
  [WorkspaceSection.ExtractWorkflow]: WorkspaceSection.ExtractWorkflow,
  [WorkspaceSection.ProcessWorkflow]: WorkspaceSection.ProcessWorkflow,
};

/**
 * back-compat: given a workspace section and an extended entity type (which can
 * be either the workflow's sourceType or its targetType), return the single
 * entity type that needs to be selected at the configuration step.
 *
 * Falls back to `sourceType` when it differs from `targetType` (legacy browse-first).
 */
export function getBaseModelType(opts: {
  section: TWorkspaceSection;
  type: TExtendedEntitiesTypeDict;
}): TExtendedEntitiesTypeDict | undefined {
  const activity = sectionToActivity[opts.section];
  if (!activity) return undefined;

  const workflow =
    getWorkflow({ activity, targetType: opts.type }) ??
    getWorkflow({ activity, sourceType: opts.type });

  if (!workflow) return undefined;
  if (workflowHasMultipleSources(workflow)) return undefined;
  const inputs = workflow.configurationInputs ?? [];
  const required = inputs.find((i) => i.required !== false);
  if (required?.type) return required.type;
  return workflow.sourceType;
}

export function getWorkflowSegment(url: string): TActivityValue | null {
  const match = url.match(/\/workflows\/([^/]+)/);
  return match ? (match[1] as TActivityValue) : null;
}

function getWorkflowInitialStageFromSelection(
  selection: TWorkflowSchemaSelection | null | undefined
): TWorkflowInitialStage {
  if (!selection || selection.selectionMode === WorkflowSchemaSelectionMode.None) {
    return WorkflowInitialStageDict.Configure;
  }

  return WorkflowInitialStageDict.New;
}

export function getWorkflowInitialStage(opts: {
  workflow: IWorkflowDescriptor | null | undefined;
  selection?: TWorkflowSchemaSelection | null | undefined;
}): TWorkflowInitialStage {
  return resolveWorkflowRouteStage(opts);
}

export function resolveWorkflowRouteStage(opts: {
  workflow: IWorkflowDescriptor | null | undefined;
  selection?: TWorkflowSchemaSelection | null | undefined;
}): TWorkflowInitialStage {
  const { workflow, selection } = opts;

  if (!workflow) {
    return WorkflowInitialStageDict.Configure;
  }

  switch (workflow.initialStage) {
    case WorkflowInitialStagePolicyDict.Configure:
      return WorkflowInitialStageDict.Configure;
    case WorkflowInitialStagePolicyDict.Browse:
      return WorkflowInitialStageDict.New;
    case WorkflowInitialStagePolicyDict.Schema:
      return getWorkflowInitialStageFromSelection(selection);
    default:
      return WorkflowInitialStageDict.Configure;
  }
}

export async function inferWorkflowStartingPageRemoteSchemaBased(opts: {
  qc?: QueryClient;
  activity: TActivityValue;
  targetType: TExtendedEntitiesTypeDict;
}): Promise<TResolvedWorkflowInitialStage> {
  const workflow = getWorkflow({ activity: opts.activity, targetType: opts.targetType });

  if (!workflow) {
    return { stage: WorkflowInitialStageDict.Configure, workflow: null, schemaSelection: null };
  }

  let schemaSelection: TWorkflowSchemaSelection | null | undefined;

  if (workflow.initialStage === WorkflowInitialStagePolicyDict.Schema) {
    const schemaName = workflow.scanConfig?.schemaName;

    if (!schemaName) {
      return {
        stage: WorkflowInitialStageDict.Configure,
        workflow,
        schemaSelection: null,
      };
    }

    const schema = await fetchObiOneJsonSchema({ qc: opts.qc, schemaName });
    schemaSelection = parseWorkflowSchemaSelection({ schema, schemaName });
  }

  return {
    stage: resolveWorkflowRouteStage({ workflow, selection: schemaSelection }),
    workflow,
    schemaSelection: schemaSelection ?? null,
  };
}

function renderBreadcrumbNode(
  node: TWorkflowBreadcrumbNode,
  context: TWorkflowBreadcrumbContext
): ReactNode {
  return typeof node === 'function' ? node(context) : node;
}

/**
 * resolves the `/new/{type}` breadcrumb directly from the workflow's definition
 * {@link IWorkflowDescriptor.breadcrumb}
 */
export function resolveWorkflowBreadcrumb(opts: {
  workflow: IWorkflowDescriptor;
  activity: TActivityValue;
  phase: TWorkflowBreadcrumbPhase;
  activeEntityType: TExtendedEntitiesTypeDict | null;
}): { root: ReactNode; current: ReactNode } {
  const { workflow, activity, phase, activeEntityType } = opts;
  const breadcrumb = workflow.breadcrumb;

  if (!breadcrumb) {
    return { root: null, current: null };
  }

  const context: TWorkflowBreadcrumbContext = { workflow, activity, phase, activeEntityType };
  const step = breadcrumb.steps?.[phase];

  return {
    root: renderBreadcrumbNode(breadcrumb.root, context),
    current: step !== undefined ? renderBreadcrumbNode(step, context) : null,
  };
}
