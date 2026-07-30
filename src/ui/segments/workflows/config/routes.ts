import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { config } from '@/config';
import { WorkflowActivityDictValue } from '@/constants';
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
import { featuresSatisfied, getWorkflow } from '@/ui/segments/workflows/config/helpers';
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
import type { TWorkflowSchemaSelection } from '@/features/scan-config/workflow/workflow-schema-selection';
import type { WorkspaceContext } from '@/types/common';
import type { IWorkflowDescriptor, TActivityValue } from '@/ui/segments/workflows/config/types';

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
  query = {},
}: {
  activity: TActivityValue;
  targetType: TExtendedEntitiesTypeDict;
  workspace: WorkspaceContext;
  entityId: string;
  entityType?: TExtendedEntitiesTypeDict;
  selection?: TWorkflowSessionSelectionPayload;
  skipSelectionPersist?: boolean;
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
    entityRef: skipSelectionPersist || !entityType ? undefined : { type: entityType, id: entityId },
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

/** configure URL for "simulate" on entity detail pages (data view action menu) */
export function buildSimulateConfigureUrlFromDataViewEntity({
  workspace,
  extendedType,
  entityId,
  entity,
  flags,
}: {
  workspace: WorkspaceContext;
  extendedType: TExtendedEntitiesTypeDict;
  entityId: string;
  entity: { scale?: ICircuit['scale'] };
  flags?: FeatureFlags;
}): string | null {
  const sourceType = resolveSimulateSourceTypeFromDataView(extendedType, entity);
  if (!sourceType) {
    return null;
  }

  const workflow = getWorkflow({
    activity: WorkflowActivityDictValue.simulate,
    sourceType,
  });

  // Gate the simulate entry point on the resolved workflow's feature flags, so the button is
  // hidden whenever the workflow requires a flag the user doesn't have (e.g. whole-brain sim).
  if (!workflow || !featuresSatisfied(workflow.requiredFeatures, flags)) {
    return null;
  }

  return buildConfigureUrlForEntity({
    activity: WorkflowActivityDictValue.simulate,
    targetType: workflow.targetType,
    workspace,
    entityId,
    entityType: sourceType,
    query: {
      [PanelQueryParam]: WorkflowSimulatePanels.Configuration,
      [WORKFLOW_SESSION_ID_SEARCH_PARAM]: createWorkflowSessionId(),
    },
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
