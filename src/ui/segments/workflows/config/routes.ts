import sortBy from 'es-toolkit/compat/sortBy';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { config } from '@/config';
import { WorkflowActivityDictValue } from '@/constants';
import { circuitTypes, getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { createWorkflowSessionId } from '@/features/scan-config/workflow/session';
import { getSimulateCircuitSourceTypeByScale } from '@/features/scan-config/workflow/simulate-circuit-workflows';
import { ScanConfigEntitySourceMode } from '@/features/scan-config/workflow/types';
import { WorkflowSchemaSelectionMode } from '@/features/scan-config/workflow/workflow-schema-selection';
import {
  saveWorkflowSessionSelection,
  type TWorkflowSessionSelectionPayload,
  type TWorkflowSessionSelectionRef,
  WorkflowSessionSelectionMode,
} from '@/features/scan-config/workflow/workflow-session-selection';
import { ActivityRegistry } from '@/ui/segments/workflows/config/activities';
import {
  featuresSatisfied,
  getWorkflow,
  getWorkflowEntityLabel,
} from '@/ui/segments/workflows/config/helpers';
import {
  type TWorkflowInitialStage,
  WORKFLOW_SESSION_ID_SEARCH_PARAM,
  WorkflowInitialStageDict,
  WorkflowInitialStagePolicyDict,
} from '@/ui/segments/workflows/config/types';
import {
  PanelQueryParam,
  WorkflowSimulatePanels,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';
import { makePathParamUrlFromExtendedType } from '@/utils/url-builder';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { FeatureFlags } from '@/features/feature-flags/flags';
import type { TWorkflowEntitySeed } from '@/features/scan-config/workflow/seeding/types';
import type { TWorkflowSchemaSelection } from '@/features/scan-config/workflow/workflow-schema-selection';
import type { WorkspaceContext } from '@/types/common';
import type { BreadcrumbTrailItem } from '@/ui/molecules/breadcrumb';
import type {
  IWorkflowDescriptor,
  TActivityEntry,
  TActivityValue,
} from '@/ui/segments/workflows/config/types';

function toWorkflowRouteTypeSegment(targetType: TExtendedEntitiesTypeDict) {
  return makePathParamUrlFromExtendedType({ extendedType: targetType }).pathParam;
}

function workflowWorkspaceBasePath(workspace: WorkspaceContext) {
  return `${config.ROOT_ROUTE}/${workspace.virtualLabId}/${workspace.projectId}/workflows`;
}

export const WORKFLOW_HOME_QUERY_KEYS = {
  activity: 'activity',
  entityType: 'type',
} as const;

export function buildWorkflowHomeHref({
  activity,
  targetType,
  workspace,
}: {
  activity?: TActivityValue;
  targetType?: TExtendedEntitiesTypeDict;
  workspace: WorkspaceContext;
}): string {
  return appendQuery(workflowWorkspaceBasePath(workspace), {
    [WORKFLOW_HOME_QUERY_KEYS.activity]: activity,
    [WORKFLOW_HOME_QUERY_KEYS.entityType]: targetType,
  });
}

/**
 * The `activity › workflow` head of every workflow breadcrumb (configure and details pages), so
 * both name the same workflow the same way. `fallbackType` labels it when no descriptor matched.
 */
export function buildWorkflowCrumbs({
  activity,
  workflow,
  workspace,
  fallbackType,
}: {
  activity: TActivityEntry | null;
  workflow: IWorkflowDescriptor | null;
  workspace: WorkspaceContext;
  fallbackType?: TExtendedEntitiesTypeDict;
}): BreadcrumbTrailItem[] {
  const label = workflow?.label ?? getWorkflowEntityLabel(workflow?.sourceType ?? fallbackType);
  const href = (targetType?: TExtendedEntitiesTypeDict) =>
    buildWorkflowHomeHref({ activity: activity?.value, targetType, workspace });

  return [
    ...(activity ? [{ key: 'activity', label: activity.label, href: href() }] : []),
    ...(label
      ? [
          {
            key: 'type',
            label,
            href: href(workflow?.targetType ?? fallbackType),
            className: 'max-w-96 truncate',
          },
        ]
      : []),
  ];
}

function appendQuery(pathname: string, query: Record<string, string | undefined>) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') {
      params.set(key, value);
    }
  }

  const queryString = params.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
}

function usesStaticScanConfigConfigureRoute(workflow: IWorkflowDescriptor | null): boolean {
  return (
    workflow?.isScanConfig === true &&
    workflow.scanConfig?.definition.entity.mode === ScanConfigEntitySourceMode.StaticType
  );
}

/**
 * resolves the workflow session id embedded in scan-config configure URLs
 *
 * session ids (`wf_*`) are route parameters for session-based workflows, this helper
 * decides whether to reuse an id, generate an empty slot, or persist browse selection
 * to `sessionStorage` before returning the id
 *
 * resolution order:
 * 1. `sessionId` — reuse as-is (caller owns storage)
 * 2. `skipSelectionPersist` new id only; nothing written (duplicate/resume via `?origin=`)
 * 3. `selection`: persist full browse payload; return its storage key
 * 4. `entityRef`: wrap as single-item selection, persist, return key
 * 5. fallback new id with no persisted selection (configure-only entry)
 *
 * @returns workflow session id suitable for the configure path segment
 */
function resolveScanConfigSessionId(opts: {
  sessionId?: string;
  skipSelectionPersist?: boolean;
  selection?: TWorkflowSessionSelectionPayload;
  entityRef?: TWorkflowSessionSelectionRef;
}): string {
  if (opts.sessionId) {
    return opts.sessionId;
  }

  if (opts.skipSelectionPersist) {
    return createWorkflowSessionId();
  }

  if (opts.selection) {
    return saveWorkflowSessionSelection(opts.selection);
  }

  if (opts.entityRef) {
    const payload: TWorkflowSessionSelectionPayload = {
      mode: WorkflowSessionSelectionMode.Single,
      item: opts.entityRef,
    };
    return saveWorkflowSessionSelection(payload);
  }

  return createWorkflowSessionId();
}

function buildLegacyConfigureUrl({
  activity,
  workflow,
  workspace,
  query = {},
}: {
  activity: TActivityValue;
  workflow: IWorkflowDescriptor;
  workspace: Pick<WorkspaceContext, 'virtualLabId' | 'projectId'>;
  query?: Record<string, string | undefined>;
}): string {
  const pathname = `${workflowWorkspaceBasePath(workspace)}/${activity}/configure/${toWorkflowRouteTypeSegment(workflow.targetType)}`;

  return appendQuery(pathname, {
    ...query,
    [WORKFLOW_SESSION_ID_SEARCH_PARAM]: createWorkflowSessionId(),
  });
}

/** Scan-config configure URL with the workflow session id in the path. */
function buildScanConfigConfigureUrl({
  activity,
  targetType,
  workspace,
  sessionId,
  skipSelectionPersist,
  selection,
  entityRef,
  query = {},
}: {
  activity: TActivityValue;
  targetType: TExtendedEntitiesTypeDict;
  workspace: WorkspaceContext;
  sessionId?: string;
  skipSelectionPersist?: boolean;
  selection?: TWorkflowSessionSelectionPayload;
  entityRef?: TWorkflowSessionSelectionRef;
  query?: Record<string, string | undefined>;
}): string {
  const resolvedSessionId = resolveScanConfigSessionId({
    sessionId,
    skipSelectionPersist,
    selection,
    entityRef,
  });

  const pathname = `${workflowWorkspaceBasePath(workspace)}/${activity}/configure/${toWorkflowRouteTypeSegment(targetType)}/${resolvedSessionId}`;

  return appendQuery(pathname, query);
}

/** configure URL when the user has already picked entities on the browse page. */
function buildConfigureUrlWithSelection({
  activity,
  targetType,
  workspace,
  selection,
  query = {},
}: {
  activity: TActivityValue;
  targetType: TExtendedEntitiesTypeDict;
  workspace: WorkspaceContext;
  selection: TWorkflowSessionSelectionPayload;
  query?: Record<string, string | undefined>;
}): string {
  const workflow = getWorkflow({ activity, targetType });

  if (!workflow?.isScanConfig || usesStaticScanConfigConfigureRoute(workflow)) {
    throw new Error(
      `Workflow ${activity} / ${targetType} does not support session selection configure`
    );
  }

  return buildScanConfigConfigureUrl({
    activity,
    targetType,
    workspace,
    selection,
    query,
  });
}

export function buildConfigureUrlForEntity({
  activity,
  targetType,
  workspace,
  entityId,
  entityType,
  selection,
  skipSelectionPersist,
  seed,
  query = {},
}: {
  activity: TActivityValue;
  targetType: TExtendedEntitiesTypeDict;
  workspace: WorkspaceContext;
  entityId: string;
  entityType?: TExtendedEntitiesTypeDict;
  selection?: TWorkflowSessionSelectionPayload;
  skipSelectionPersist?: boolean;
  /** extra configuration the editor seeds from the source entity (see workflow seeding) */
  seed?: TWorkflowEntitySeed | null;
  query?: Record<string, string | undefined>;
}): string {
  const workflow = getWorkflow({ activity, targetType });

  if (!workflow) {
    throw new Error(`No workflow registered for ${activity} / ${targetType}`);
  }

  if (selection) {
    return buildConfigureUrlWithSelection({
      activity,
      targetType,
      workspace,
      selection,
      query,
    });
  }

  if (!workflow.isScanConfig) {
    if (workflow.initialStage === WorkflowInitialStagePolicyDict.Browse) {
      const pathname = `${workflowWorkspaceBasePath(workspace)}/${activity}/configure/${toWorkflowRouteTypeSegment(entityType ?? workflow.sourceType)}/${entityId}`;
      return appendQuery(pathname, {
        ...query,
        [WORKFLOW_SESSION_ID_SEARCH_PARAM]: createWorkflowSessionId(),
      });
    }

    return buildLegacyConfigureUrl({ activity, workflow, workspace, query });
  }

  if (usesStaticScanConfigConfigureRoute(workflow)) {
    const pathname = `${workflowWorkspaceBasePath(workspace)}/${activity}/configure/${toWorkflowRouteTypeSegment(targetType)}`;
    return appendQuery(pathname, query);
  }

  return buildScanConfigConfigureUrl({
    activity,
    targetType,
    workspace,
    skipSelectionPersist,
    entityRef:
      skipSelectionPersist || !entityType
        ? undefined
        : { type: entityType, id: entityId, ...(seed ?? {}) },
    selection,
    query,
  });
}

/** URL when leaving the workflows workflow after the user picks a workflow type. */
export function buildWorkflowStartingPageUrl({
  activity,
  targetType,
  workspace,
  stage,
  workflow,
  schemaSelection,
  query = {},
}: {
  activity: TActivityValue;
  targetType: TExtendedEntitiesTypeDict;
  workspace: WorkspaceContext;
  stage: TWorkflowInitialStage;
  workflow: IWorkflowDescriptor | null;
  schemaSelection?: TWorkflowSchemaSelection | null;
  query?: Record<string, string | undefined>;
}): string {
  if (stage === WorkflowInitialStageDict.Configure && workflow?.isScanConfig) {
    if (usesStaticScanConfigConfigureRoute(workflow)) {
      const pathname = `${workflowWorkspaceBasePath(workspace)}/${activity}/configure/${toWorkflowRouteTypeSegment(targetType)}`;
      return appendQuery(pathname, query);
    }

    const skipSelectionPersist =
      !schemaSelection || schemaSelection.selectionMode === WorkflowSchemaSelectionMode.None;

    return buildScanConfigConfigureUrl({
      activity,
      targetType,
      workspace,
      skipSelectionPersist,
      query,
    });
  }

  if (stage === WorkflowInitialStageDict.Configure && workflow && !workflow.isScanConfig) {
    return buildLegacyConfigureUrl({ activity, workflow, workspace, query });
  }

  const pathname = `${workflowWorkspaceBasePath(workspace)}/${activity}/${stage}/${toWorkflowRouteTypeSegment(targetType)}`;

  return appendQuery(pathname, query);
}

/** scan-config configure URL */
/** maps a data-view entity to the simulate workflow source type */
// TODO: make it more robust, move this to the domain configuration
export function resolveSimulateSourceTypeFromDataView(
  extendedType: TExtendedEntitiesTypeDict,
  entity: { scale?: ICircuit['scale'] }
): TExtendedEntitiesTypeDict | null {
  if (extendedType === ExtendedEntitiesTypeDict.Circuit && entity.scale) {
    return getSimulateCircuitSourceTypeByScale(entity.scale);
  }

  // ME-models simulate through the beta scan-config workflow, not the legacy browse-first one
  if (extendedType === ExtendedEntitiesTypeDict.Memodel) {
    return ExtendedEntitiesTypeDict.MemodelCircuit;
  }

  return extendedType;
}

type TDataViewLaunchAction = {
  activity: TActivityValue;
  workflow: IWorkflowDescriptor;
  label: string;
  href: string;
};

/**
 * The workflows an entity detail page can start with the entity as an input, one action each
 * (Simulate first). A workflow that produced the entity is not an input to it, so workflows
 * without input types (e-model optimization) never match.
 *
 * Circuits ignore feature flags; every other type needs the activity's and workflow's flags.
 */
export function listLaunchActionsFromDataViewEntity({
  workspace,
  extendedType,
  entityId,
  entity,
  flags,
}: {
  workspace: WorkspaceContext;
  extendedType: TExtendedEntitiesTypeDict;
  entityId: string;
  /** the source entity: its `scale` picks the simulate workflow, and each workflow's seed reads the rest */
  entity: object;
  flags?: FeatureFlags;
}): TDataViewLaunchAction[] {
  const isCircuit =
    circuitTypes.includes(extendedType) ||
    extendedType === ExtendedEntitiesTypeDict.SingleNeuronCircuit;
  const inputType = isCircuit ? ExtendedEntitiesTypeDict.Circuit : extendedType;
  const simulatableConfig = getEntityByExtendedType({ type: extendedType })?.isSimulatable;
  const isSimulatable =
    typeof simulatableConfig === 'function'
      ? (simulatableConfig as (entity: object) => boolean)(entity)
      : Boolean(simulatableConfig);

  const activities = sortBy(Object.values(ActivityRegistry), (activity) =>
    activity.value === WorkflowActivityDictValue.simulate ? 0 : 1
  );

  return activities.flatMap((activity) => {
    const isSimulate = activity.value === WorkflowActivityDictValue.simulate;
    if (activity.disabled || (isSimulate && !isSimulatable)) return [];
    if (!isCircuit && !featuresSatisfied(activity.requiredFeatures, flags)) return [];

    const type = isSimulate
      ? resolveSimulateSourceTypeFromDataView(extendedType, entity as { scale?: ICircuit['scale'] })
      : inputType;

    return activity.workflows
      .filter(
        (workflow) =>
          !workflow.disabled &&
          (isCircuit || featuresSatisfied(workflow.requiredFeatures, flags)) &&
          (workflow.configurationInputs?.some((input) => input.type === type) ||
            (workflow.sourceType === type && workflow.sourceType !== workflow.targetType)) &&
          (workflow.acceptsInput?.(entity) ?? true)
      )
      .map((workflow) => ({
        activity: activity.value,
        workflow,
        label: workflow.verb ?? activity.label,
        href: buildConfigureUrlForEntity({
          activity: activity.value,
          targetType: workflow.targetType,
          workspace,
          entityId,
          entityType: type ?? undefined,
          // the workflow decides what else travels with the entity (see `workflow/seeding`)
          seed: workflow.scanConfig?.definition.seed?.build(entity as never),
          query: isSimulate
            ? {
                [PanelQueryParam]: WorkflowSimulatePanels.Configuration,
                [WORKFLOW_SESSION_ID_SEARCH_PARAM]: createWorkflowSessionId(),
              }
            : undefined,
        }),
      }));
  });
}

export function buildScanConfigConfigureHref({
  activity,
  targetType,
  workspace,
  selection,
  sessionId,
  query = {},
  standalone = false,
}: {
  activity: TActivityValue;
  targetType: TExtendedEntitiesTypeDict;
  workspace: WorkspaceContext;
  selection?: TWorkflowSessionSelectionPayload;
  sessionId?: string;
  query?: Record<string, string | undefined>;
  standalone?: boolean;
}): string {
  return buildScanConfigConfigureUrl({
    activity,
    targetType,
    workspace,
    sessionId,
    skipSelectionPersist: standalone && !selection,
    selection,
    query,
  });
}
