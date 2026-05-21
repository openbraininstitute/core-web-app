import { config } from '@/config';
import { SCAN_CONFIG_ORIGIN_ID_SEARCH_PARAM } from '@/features/scan-config/workflow/constants';
import {
  createWorkflowSessionId,
  persistSingleSelectionForConfigure,
  persistWorkflowSelectionForConfigure,
} from '@/features/scan-config/workflow/selection';
import {
  getWorkflow,
  isMultipleWorkflowSource,
  type TWorkflowInitialStage,
  WorkflowInitialStageDict,
} from '@/ui/segments/workflows/config/helpers';
import {
  WORKFLOW_SESSION_ID_SEARCH_PARAM,
  WorkflowConfigureRoutingDict,
  WorkflowInitialStagePolicyDict,
} from '@/ui/segments/workflows/config/types';
import {
  makePathParamUrlFromExtendedType,
  resolveExtendedTypeFromPathParamUrl,
} from '@/utils/url-builder';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TWorkflowSelectionPayload } from '@/features/scan-config/workflow/selection/types';
import type { WorkspaceContext } from '@/types/common';
import type { IWorkflowDescriptor, TActivityValue } from '@/ui/segments/workflows/config/types';
import type { KebabCase } from '@/utils/type';

/**
 * Workflow configure URL builders.
 *
 * Pick the builder that matches **where navigation starts**, not the destination page alone:
 *
 * | Builder | Start from | Result |
 * | --- | --- | --- |
 * | {@link buildWorkflowHubStageHref} | `/workflows` hub (activity card) | `/new/{type}` browse, or scan-config `/configure/{type}/{session}` |
 * | {@link buildEntityConfigureHref} | Entity known (mini-detail, “Use model”) | Registry picks scan-config vs custom configure |
 * | {@link buildScanConfigConfigureHref} | Scan-config session/selection already resolved | `/configure/{type}/{sessionId}` (+ optional query) |
 *
 * Custom (non-scan-config) configure URLs are built internally by {@link buildEntityConfigureHref}
 * via `buildCustomConfigureHref` (session in `?session=`, entity id in path when browse-first).
 *
 * @see {@link WORKFLOW_SESSION_ID_SEARCH_PARAM} for custom configure session query param
 * @see {@link WorkflowConfigureRoutingDict} for scan-config `Standalone` vs persisted selection
 */

/** kebab-case route segment for `/new` and `/configure` from a workflow target type */
export function getWorkflowTypeRouteKey(targetType: TExtendedEntitiesTypeDict): string {
  return makePathParamUrlFromExtendedType({ extendedType: targetType }).pathParam;
}

/** resolves `[type]` route param back to {@link TExtendedEntitiesTypeDict} */
export function resolveWorkflowTargetTypeFromRoute(
  typeRouteKey: KebabCase<TExtendedEntitiesTypeDict>
): TExtendedEntitiesTypeDict {
  return resolveExtendedTypeFromPathParamUrl({ pathParam: typeRouteKey }).type;
}

/**
 * Pathname prefix for scan-config configure routes, through `/configure/{type}` but
 * **without** the trailing session id segment.
 *
 * @example
 * // `/app/vl-1/proj-1/workflows/build/configure/em-synapse-mapping-campaign`
 * buildWorkflowConfigurePathPrefix({ activity, targetType, workspace });
 */
export function buildWorkflowConfigurePathPrefix({
  activity,
  targetType,
  workspace,
}: {
  activity: TActivityValue;
  targetType: TExtendedEntitiesTypeDict;
  workspace: Pick<WorkspaceContext, 'virtualLabId' | 'projectId'>;
}): string {
  return `${config.ROOT_ROUTE}/${workspace.virtualLabId}/${workspace.projectId}/workflows/${activity}/configure/${getWorkflowTypeRouteKey(targetType)}`;
}

function resolveCustomConfigureSegment(
  workflow: IWorkflowDescriptor,
  entityType?: TExtendedEntitiesTypeDict
): string {
  if (!isMultipleWorkflowSource(workflow.sourceType)) {
    return getWorkflowTypeRouteKey(workflow.sourceType);
  }

  if (entityType) {
    return getWorkflowTypeRouteKey(entityType);
  }

  return getWorkflowTypeRouteKey(workflow.targetType);
}

/**
 * Custom (non-scan-config) configure URL.
 *
 * Session id is always in the query (`?session=`). Entity id appears in the path only when
 * {@link WorkflowInitialStagePolicyDict.Browse} applies (browse-first workflows).
 *
 * @internal Not exported — use {@link buildEntityConfigureHref} at call sites.
 */
function buildCustomConfigureHref({
  activity,
  workflow,
  workspace,
  entityId,
  entityType,
  query = {},
}: {
  activity: TActivityValue;
  workflow: IWorkflowDescriptor;
  workspace: Pick<WorkspaceContext, 'virtualLabId' | 'projectId'>;
  entityId: string;
  entityType?: TExtendedEntitiesTypeDict;
  query?: Record<string, string | undefined>;
}): string {
  const sessionId =
    entityType && entityId
      ? persistSingleSelectionForConfigure({ type: entityType, id: entityId })
      : createWorkflowSessionId();

  const params = new URLSearchParams({
    [WORKFLOW_SESSION_ID_SEARCH_PARAM]: sessionId,
  });

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') {
      params.set(key, value);
    }
  }

  const segment = resolveCustomConfigureSegment(workflow, entityType);
  const prefix = `${config.ROOT_ROUTE}/${workspace.virtualLabId}/${workspace.projectId}/workflows/${activity}/configure/${segment}`;
  const queryString = params.toString();

  if (workflow.initialStage === WorkflowInitialStagePolicyDict.Browse) {
    return `${prefix}/${entityId}${queryString ? `?${queryString}` : ''}`;
  }

  return `${prefix}${queryString ? `?${queryString}` : ''}`;
}

/**
 * Scan-config configure URL with the workflow session id in the **path**.
 *
 * ```
 * /app/{vl}/{proj}/workflows/{activity}/configure/{kebab-targetType}/{sessionId}[?query]
 * ```
 *
 * Use when the workflow is scan-config (`isScanConfig`) and you already know what to put in
 * `sessionId` (or can derive it from `selection` / `entityType`+`entityId`). Typical call sites:
 * browse listing (“Use selection”), duplicate campaign, hub configure stage, and
 * {@link buildEntityConfigureHref} after registry lookup.
 *
 * @param sessionId - Reuse an existing id (e.g. from hub `?session=`) without persisting again.
 * @param standalone - When {@link WorkflowConfigureRoutingDict.Standalone}: only allocate a route
 *   id; do not persist browse selection into session storage.
 * @param originId - Sets {@link SCAN_CONFIG_ORIGIN_ID_SEARCH_PARAM} for duplicate-from-origin flows.
 *
 * @example
 * // Browse row with a persisted multi-selection payload
 * buildScanConfigConfigureHref({
 *   activity: 'build',
 *   targetType: ExtendedEntitiesTypeDict.EmSynapseMappingCampaign,
 *   workspace,
 *   selection: payloadFromTable,
 * });
 *
 * @example
 * // Hub already created a session; pass it through
 * buildScanConfigConfigureHref({
 *   activity, targetType, workspace,
 *   sessionId: searchParams.get('session') ?? undefined,
 *   standalone: true,
 * });
 *
 * @see {@link buildEntityConfigureHref} when you only have `entityId` and need registry routing
 * @see {@link buildWorkflowHubStageHref} when navigating from the workflows hub
 */
export function buildScanConfigConfigureHref({
  activity,
  targetType,
  workspace,
  entityType,
  entityId,
  selection,
  sessionId: sessionIdOverride,
  originId,
  query = {},
  standalone = false,
}: {
  activity: TActivityValue;
  targetType: TExtendedEntitiesTypeDict;
  workspace: Pick<WorkspaceContext, 'virtualLabId' | 'projectId'>;
  entityType?: TExtendedEntitiesTypeDict;
  entityId?: string;
  selection?: TWorkflowSelectionPayload;
  /** reuse a session id from hub navigation (`?session=`) without persisting again */
  sessionId?: string;
  originId?: string;
  query?: Record<string, string | undefined>;
  /** when true, do not persist browse selection (standalone scan-config workflows) */
  standalone?: boolean;
}): string {
  const sessionId =
    sessionIdOverride ??
    (standalone
      ? createWorkflowSessionId()
      : selection
        ? persistWorkflowSelectionForConfigure(selection)
        : entityType && entityId
          ? persistSingleSelectionForConfigure({ type: entityType, id: entityId })
          : createWorkflowSessionId());

  const params = new URLSearchParams();

  if (originId) {
    params.set(SCAN_CONFIG_ORIGIN_ID_SEARCH_PARAM, originId);
  }

  for (const [key, value] of Object.entries(query)) {
    if (key === 'dataType') {
      continue;
    }
    if (value !== undefined && value !== '') {
      params.set(key, value);
    }
  }

  const queryString = params.toString();
  const prefix = buildWorkflowConfigurePathPrefix({ activity, targetType, workspace });

  return `${prefix}/${sessionId}${queryString ? `?${queryString}` : ''}`;
}

/**
 * Configure URL when navigation starts from a **known entity** (id required).
 *
 * Looks up the workflow in the registry and delegates:
 * - **Scan-config** → {@link buildScanConfigConfigureHref} (session in path)
 * - **Custom page** → `buildCustomConfigureHref` (session in `?session=`, path shape from
 *   {@link WorkflowInitialStagePolicyDict})
 *
 * Prefer this over {@link buildScanConfigConfigureHref} at UI boundaries (mini-detail actions,
 * workflow links) so routing stays aligned with `IWorkflowDescriptor.isScanConfig`.
 *
 * @param entityId - Required entity or campaign id from browse / detail context.
 * @param entityType - Source entity type when it differs from `targetType` (e.g. Memodel → simulation).
 * @param selection - Optional pre-built payload; scan-config workflows persist it when provided.
 *
 * @throws {Error} When no workflow is registered for `activity` / `targetType`.
 *
 * @example
 * // Custom simulate page (Memodel → SingleNeuronSimulation)
 * buildEntityConfigureHref({
 *   activity: 'simulate',
 *   targetType: ExtendedEntitiesTypeDict.SingleNeuronSimulation,
 *   workspace,
 *   entityId: 'memodel-42',
 *   entityType: ExtendedEntitiesTypeDict.Memodel,
 * });
 *
 * @see {@link buildScanConfigConfigureHref} for scan-config-only flows without registry dispatch
 */
export function buildEntityConfigureHref({
  activity,
  targetType,
  workspace,
  entityId,
  entityType,
  originId,
  selection,
  query = {},
}: {
  activity: TActivityValue;
  targetType: TExtendedEntitiesTypeDict;
  workspace: Pick<WorkspaceContext, 'virtualLabId' | 'projectId'>;
  entityId: string;
  entityType?: TExtendedEntitiesTypeDict;
  originId?: string;
  selection?: TWorkflowSelectionPayload;
  query?: Record<string, string | undefined>;
}): string {
  const workflow = getWorkflow({ activity, targetType });

  if (!workflow) {
    throw new Error(`No workflow registered for ${activity} / ${targetType}`);
  }

  if (!workflow.isScanConfig) {
    return buildCustomConfigureHref({
      activity,
      workflow,
      workspace,
      entityId,
      entityType,
      query,
    });
  }

  const standalone = workflow.configureRouting === WorkflowConfigureRoutingDict.Standalone;

  return buildScanConfigConfigureHref({
    activity,
    targetType,
    workspace,
    entityType,
    entityId,
    originId,
    selection,
    query,
    standalone,
  });
}

/**
 * URL for leaving the **workflows hub** (`/workflows`) after the user picks an activity card.
 *
 * ```
 * stage === 'new'      → /workflows/{activity}/new/{kebab-targetType}[?query]
 * stage === 'configure' + scan-config → buildScanConfigConfigureHref(...)
 * stage === 'configure' + custom      → /workflows/{activity}/configure/{kebab-targetType}[?query]
 * ```
 *
 * Does not accept an entity id — use {@link buildEntityConfigureHref} once the user has selected
 * a row or opened a mini-detail action.
 *
 * @param stage - {@link TWorkflowInitialStage}: `'new'` (browse) or `'configure'` (direct configure).
 * @param workflow - Registry entry; when `isScanConfig` and `stage === 'configure'`, delegates to
 *   {@link buildScanConfigConfigureHref} (honours `sessionId` and standalone routing).
 *
 * @example
 * // Open EM synapse mapping browse
 * buildWorkflowHubStageHref({
 *   activity: 'build',
 *   targetType: ExtendedEntitiesTypeDict.EmSynapseMappingCampaign,
 *   workspace,
 *   stage: 'new',
 *   workflow: getWorkflow({ activity, targetType }),
 * });
 *
 * @see {@link buildEntityConfigureHref} for entity-driven navigation after browse
 */
export function buildWorkflowHubStageHref({
  activity,
  targetType,
  workspace,
  stage,
  workflow,
  sessionId,
  query = {},
}: {
  activity: TActivityValue;
  targetType: TExtendedEntitiesTypeDict;
  workspace: Pick<WorkspaceContext, 'virtualLabId' | 'projectId'>;
  stage: TWorkflowInitialStage;
  workflow: IWorkflowDescriptor | null;
  sessionId?: string;
  query?: Record<string, string | undefined>;
}): string {
  if (stage === WorkflowInitialStageDict.Configure && workflow?.isScanConfig) {
    return buildScanConfigConfigureHref({
      activity,
      targetType,
      workspace,
      sessionId,
      standalone: workflow.configureRouting === WorkflowConfigureRoutingDict.Standalone,
      query,
    });
  }

  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') {
      params.set(key, value);
    }
  }

  const queryString = params.toString();

  return `${config.ROOT_ROUTE}/${workspace.virtualLabId}/${workspace.projectId}/workflows/${activity}/${stage}/${getWorkflowTypeRouteKey(targetType)}${queryString ? `?${queryString}` : ''}`;
}
