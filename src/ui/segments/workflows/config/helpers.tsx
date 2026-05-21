import { groupBy, sortBy } from 'es-toolkit/compat';

import {
  ExtendedEntitiesTypeDict,
  type TExtendedEntitiesTypeDict,
} from '@/api/entitycore/types/extended-entity-type';
import { WorkspaceSection } from '@/constants';
import { fetchSchema } from '@/features/scan-config/components/hooks/schema';
import { parseSchemaInitializeSelection } from '@/features/scan-config/schema/parse-initialize-selection';
import { WorkflowInitializeSelectionMode } from '@/features/scan-config/schema/types';
import { DownloadPanel } from '@/ui/segments/explore/circuit/elements/download-panel';
import { ActivityRegistry } from '@/ui/segments/workflows/config/activities';
import { EntityTypeCatalog } from '@/ui/segments/workflows/config/entity-types';

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
  type TWorkflowListContext,
  type TWorkflowListSort,
  type TWorkflowSourceType,
  WorkflowInitialStagePolicyDict,
  WorkflowListContextDict,
  WorkflowListSortDict,
  WorkflowSelectionSourceTypeDict,
} from './types';

import type { ReactNode } from 'react';
import type { TWorkspaceSection } from '@/constants';
import type { FeatureFlags, FlagKey } from '@/features/feature-flags/flags';
import type { TWorkflowSelectionConfig } from '@/features/scan-config/schema/types';

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

export function isMultipleWorkflowSource(
  sourceType: TWorkflowSourceType | null | undefined
): sourceType is typeof WorkflowSelectionSourceTypeDict.Multiple {
  return sourceType === WorkflowSelectionSourceTypeDict.Multiple;
}

export function workflowHasMultipleSelectionInputs(workflow: IWorkflowDescriptor): boolean {
  return isMultipleWorkflowSource(workflow.sourceType);
}

/** first url segment after choosing a workflow type: entity browse (`new`) or configure (`configure`). */
// TODO: rename "new" to "browse"
export const WorkflowInitialStageDict = {
  New: 'new',
  Configure: 'configure',
} as const;
export type TWorkflowInitialStage =
  (typeof WorkflowInitialStageDict)[keyof typeof WorkflowInitialStageDict];

export type TResolvedWorkflowInitialStage = {
  stage: TWorkflowInitialStage;
  workflow: IWorkflowDescriptor | null;
  /** when true, append {@link WORKFLOW_SESSION_ID_SEARCH_PARAM} on navigation from the workflows hub */
  attachSessionId: boolean;
};

/**
 * maps schema `initialize` selection to `new` vs `configure`
 *
 * `none` → configure; `single` | `multiple` | `grouped` → browse (`new`)
 */
export function getWorkflowInitialStageFromSelection(
  selection: TWorkflowSelectionConfig | null | undefined
): TWorkflowInitialStage {
  if (!selection || selection.selectionMode === WorkflowInitializeSelectionMode.None) {
    return WorkflowInitialStageDict.Configure;
  }

  return WorkflowInitialStageDict.New;
}

function resolveAttachSessionOnNavigate(
  workflow: IWorkflowDescriptor,
  stage: TWorkflowInitialStage
): boolean {
  if (workflow.attachSessionOnNavigate !== undefined) {
    return workflow.attachSessionOnNavigate;
  }

  return stage === WorkflowInitialStageDict.New;
}

/**
 * resolves `new` vs `configure` from {@link IWorkflowDescriptor.initialStage}
 *
 * only `schema` policy reads `selection` (from scan-config `initialize`)
 */
export function getWorkflowInitialStage(opts: {
  workflow: IWorkflowDescriptor | null | undefined;
  selection?: TWorkflowSelectionConfig | null | undefined;
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

/** whether `/workflows/{activity}/new/{type}` may render (schema workflows may redirect to configure). */
export function workflowAllowsBrowseRoute(
  workflow: IWorkflowDescriptor | null | undefined
): boolean {
  return workflow != null && workflow.initialStage !== WorkflowInitialStagePolicyDict.Configure;
}

/**
 * resolves the initial route segment and workflow descriptor for a workflow type
 *
 * @returns {@link TResolvedWorkflowInitialStage} with `workflow` from {@link getWorkflow}
 * @throws when {@link fetchSchema} fails for a workflow with `initialStage: schema`
 */
export async function resolveWorkflowInitialStage(opts: {
  activity: TActivityValue;
  targetType: TExtendedEntitiesTypeDict;
}): Promise<TResolvedWorkflowInitialStage> {
  const workflow = getWorkflow({ activity: opts.activity, targetType: opts.targetType });

  if (!workflow) {
    return { stage: WorkflowInitialStageDict.Configure, workflow: null, attachSessionId: false };
  }

  let selection: TWorkflowSelectionConfig | null | undefined;

  if (workflow.initialStage === WorkflowInitialStagePolicyDict.Schema) {
    const schemaName = workflow.scanConfig?.schemaName;

    if (!schemaName) {
      const stage = WorkflowInitialStageDict.Configure;
      return {
        stage,
        workflow,
        attachSessionId: resolveAttachSessionOnNavigate(workflow, stage),
      };
    }

    const schema = await fetchSchema({ schemaName });
    selection = parseSchemaInitializeSelection({ schema, schemaName });
  }

  const stage = getWorkflowInitialStage({ workflow, selection });

  return {
    stage,
    workflow,
    attachSessionId: resolveAttachSessionOnNavigate(workflow, stage),
  };
}

/**
 * human-readable noun for the primary entity the user selects (breadcrumbs, table copy)
 *
 * returns plural `entities` when the workflow has multiple {@link IWorkflowConfigurationInput}
 * entries or no resolvable type otherwise the entity catalog `title` or `label`, or `entity`
 */
export function getWorkflowBrowseSelectionLabel(opts: {
  activity: TActivityValue | string | null | undefined;
  sourceType?: TWorkflowSourceType;
  targetType?: TExtendedEntitiesTypeDict;
  context?: TWorkflowListContext;
}): string {
  const workflow = getWorkflow(opts);
  if (!workflow || workflowHasMultipleSelectionInputs(workflow)) {
    return 'entities';
  }

  const primaryInput = getPrimaryConfigurationInput(opts);
  const entityType =
    primaryInput?.type ??
    (isMultipleWorkflowSource(workflow.sourceType) ? undefined : workflow.sourceType);

  if (!entityType) {
    return 'entities';
  }

  return getEntityMeta(entityType)?.title ?? getEntityMeta(entityType)?.label ?? 'entity';
}

function resolveWorkflowEntity(workflow: IWorkflowDescriptor): TEntityTypeMeta {
  const catalogKey = isMultipleWorkflowSource(workflow.sourceType)
    ? workflow.targetType
    : workflow.sourceType;

  return (
    EntityTypeCatalog[catalogKey] ?? {
      value: catalogKey,
      group: EntityGroupDict.Cellular,
      label: workflow.label ?? String(catalogKey),
    }
  );
}

function resolveWorkflow(
  workflow: IWorkflowDescriptor,
  flags: FeatureFlags | undefined
): ResolvedWorkflow {
  const entity = resolveWorkflowEntity(workflow);
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
  sourceType?: TWorkflowSourceType;
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

export function getSourceType(opts: {
  activity: TActivityValue | string | null | undefined;
  targetType: TExtendedEntitiesTypeDict;
  context?: TWorkflowListContext;
}): TWorkflowSourceType | undefined {
  return getWorkflow({
    activity: opts.activity,
    targetType: opts.targetType,
    context: opts.context,
  })?.sourceType;
}

export function getTargetType(opts: {
  activity: TActivityValue | string | null | undefined;
  sourceType: TWorkflowSourceType;
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
  sourceType?: TWorkflowSourceType;
  targetType?: TExtendedEntitiesTypeDict;
  context?: TWorkflowListContext;
}): readonly IWorkflowConfigurationInput[] {
  return getWorkflow(opts)?.configurationInputs ?? [];
}

/**
 * returns the default configuration input (first required, falling back to the first entry)
 */
export function getPrimaryConfigurationInput(opts: {
  activity: TActivityValue | string | null | undefined;
  sourceType?: TWorkflowSourceType;
  targetType?: TExtendedEntitiesTypeDict;
  context?: TWorkflowListContext;
}): IWorkflowConfigurationInput | undefined {
  const inputs = getConfigurationInputs(opts);
  return inputs.find((i) => i.required !== false) ?? inputs[0];
}

/**
 * merges workflow `configurationInputs` with optional schema-derived browse selection rules.
 *
 * Schema `selectionMode` wins when set and not {@link WorkflowInitializeSelectionMode.None};
 * otherwise mode is `multiple` if any input allows `multiple`, else `single`. Fills
 * `acceptedEntityTypes` from inputs and defaults `tableSelectionType` to radio/checkbox.
 */
function buildSelectionConfigFromConfigurationInputs(opts: {
  inputs: readonly IWorkflowConfigurationInput[];
  schemaSelection?: TWorkflowSelectionConfig | null;
  schemaName?: TWorkflowSelectionConfig['schemaName'];
}): TWorkflowSelectionConfig {
  const { inputs, schemaSelection, schemaName } = opts;
  const resolvedSelectionMode =
    schemaSelection?.selectionMode &&
    schemaSelection.selectionMode !== WorkflowInitializeSelectionMode.None
      ? schemaSelection.selectionMode
      : inputs.some((input) => input.multiple)
        ? WorkflowInitializeSelectionMode.Multiple
        : WorkflowInitializeSelectionMode.Single;

  return {
    schemaName: schemaName ?? schemaSelection?.schemaName,
    uiElement: schemaSelection?.uiElement ?? null,
    selectionMode: resolvedSelectionMode,
    acceptedFromIdTypes: schemaSelection?.acceptedFromIdTypes ?? [],
    acceptedEntityTypes: inputs.map((input) => input.type),
    tableSelectionType:
      schemaSelection?.tableSelectionType ??
      (resolvedSelectionMode === WorkflowInitializeSelectionMode.Single ? 'radio' : 'checkbox'),
  };
}

export function resolveWorkflowBrowseSelectionConfig(opts: {
  activity: TActivityValue | string | null | undefined;
  sourceType?: TWorkflowSourceType;
  targetType?: TExtendedEntitiesTypeDict;
  context?: TWorkflowListContext;
  schemaSelection?: TWorkflowSelectionConfig | null;
}): TWorkflowSelectionConfig | null {
  const workflow = getWorkflow(opts);
  if (!workflow?.isScanConfig) {
    return null;
  }

  const inputs = getConfigurationInputs(opts);
  if (inputs.length === 0) {
    return null;
  }

  return buildSelectionConfigFromConfigurationInputs({
    inputs,
    schemaSelection: opts.schemaSelection,
    schemaName: workflow.scanConfig?.schemaName,
  });
}

export function getBaseModelType(opts: {
  section: TWorkspaceSection;
  type: TExtendedEntitiesTypeDict;
}): TExtendedEntitiesTypeDict | undefined {
  const sectionToActivity: Partial<Record<TWorkspaceSection, TActivityValue>> = {
    [WorkspaceSection.BuildWorkflow]: WorkspaceSection.BuildWorkflow,
    [WorkspaceSection.SimulateWorkflow]: WorkspaceSection.SimulateWorkflow,
    [WorkspaceSection.ExtractWorkflow]: WorkspaceSection.ExtractWorkflow,
    [WorkspaceSection.ProcessWorkflow]: WorkspaceSection.ProcessWorkflow,
  };

  const activity = sectionToActivity[opts.section];
  if (!activity) return undefined;

  const workflow =
    getWorkflow({ activity, targetType: opts.type }) ??
    getWorkflow({ activity, sourceType: opts.type });

  if (!workflow) return undefined;
  const inputs = workflow.configurationInputs ?? [];
  const required = inputs.find((i) => i.required !== false);
  if (required?.type) {
    return required.type;
  }

  if (isMultipleWorkflowSource(workflow.sourceType)) {
    return inputs[0]?.type;
  }

  return workflow.sourceType;
}

export function getWorkflowSegment(url: string): TActivityValue | null {
  const match = url.match(/\/workflows\/([^/]+)/);
  return match ? (match[1] as TActivityValue) : null;
}

const ASIDE_BY_TARGET_TYPE: Partial<Record<TExtendedEntitiesTypeDict, ReactNode>> = {
  [ExtendedEntitiesTypeDict.CircuitExtractionCampaign]: <DownloadPanel />,
  [ExtendedEntitiesTypeDict.EmSynapseMappingCampaign]: <DownloadPanel />,
};

/**
 * optional configure-page aside for scan-config workflows keyed by campaign target type
 */
export function getWorkflowConfigurePageAside(opts: {
  activity: TActivityValue;
  targetType: TExtendedEntitiesTypeDict;
}): ReactNode | undefined {
  return ASIDE_BY_TARGET_TYPE[opts.targetType];
}
