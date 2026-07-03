import { config } from '@/config';
import { DATA_GROUP_QUERY_PARAM, SCOPE_QUERY_PARAMS, WorkspaceMainPages } from '@/constants';
import { URL_PARAMS } from '@/features/brain-region-hierarchy/context';
import { WORKFLOW_HOME_QUERY_KEYS } from '@/ui/segments/workflows/config/routes';
import { getPreservedProjectSection } from '@/utils/get-section';
import { getRouteSegmentsAfterWorkspace } from '@/utils/path';
import { cleanSearchParams } from '@/utils/search-params';

/**
 * Per-section rule producing the destination inside the target workspace.
 * `rest` is the path segments after the section segment; the returned `path`
 * is relative to the workspace root (and includes the section segment).
 */
type SectionStrategy = (
  rest: string[],
  params: URLSearchParams
) => { path: string[]; params: URLSearchParams };

/**
 * Query params that survive a workspace switch on data pages: scope
 * (public/project), entity group, and the species/brain-region hierarchy
 * selection. Hierarchy ids are atlas-level (not project-scoped) and the data
 * layout's BrainRegionUrlBoundary (Sync mode) self-heals invalid ones.
 */
const DATA_QUERY_ALLOWLIST = [
  SCOPE_QUERY_PARAMS,
  DATA_GROUP_QUERY_PARAM,
  URL_PARAMS.SPECIES,
  URL_PARAMS.HIERARCHY_ID,
  URL_PARAMS.BRAIN_REGION_ID,
];

const DATA_VIEW_SEGMENT = 'view';
const DATA_BROWSE_PATH = ['browse', 'entity'];

const dataStrategy: SectionStrategy = (rest, params) => {
  const kept = cleanSearchParams({ searchParams: params, keepKeys: DATA_QUERY_ALLOWLIST });
  // detail views (/data/view/[type]/[id]/[section]) collapse to the browse
  // listing of the same type: the entity may not be accessible from the
  // target project, and we cannot know beforehand. A type-less /data/view
  // has no route of its own, so it collapses to the data root.
  if (rest[0] === DATA_VIEW_SEGMENT) {
    return {
      path: rest[1]
        ? [WorkspaceMainPages.Data, ...DATA_BROWSE_PATH, rest[1]]
        : [WorkspaceMainPages.Data],
      params: kept,
    };
  }
  return { path: [WorkspaceMainPages.Data, ...rest], params: kept };
};

// `upload` is intentionally dropped: carrying it would re-trigger the upload
// modal in the target workspace (see notebooks-layout.tsx).
const notebooksStrategy: SectionStrategy = (rest, params) => ({
  path: [WorkspaceMainPages.Notebooks, ...rest],
  params: cleanSearchParams({ searchParams: params, keepKeys: [SCOPE_QUERY_PARAMS] }),
});

// Reports content (Sanity) is global, so path and query are fully portable.
const reportsStrategy: SectionStrategy = (rest, params) => ({
  path: [WorkspaceMainPages.Reports, ...rest],
  params: new URLSearchParams(params),
});

const WORKFLOW_NEW_SEGMENT = 'new';
const WORKFLOW_CONFIGURE_SEGMENT = 'configure';

const workflowsStrategy: SectionStrategy = (rest, params) => {
  // workflows home: activity/type selection is generic across projects
  if (rest.length === 0) {
    return {
      path: [WorkspaceMainPages.Workflows],
      params: cleanSearchParams({
        searchParams: params,
        keepKeys: [WORKFLOW_HOME_QUERY_KEYS.activity, WORKFLOW_HOME_QUERY_KEYS.entityType],
      }),
    };
  }

  const [activity, stage, type] = rest;
  const scopeOnly = cleanSearchParams({ searchParams: params, keepKeys: [SCOPE_QUERY_PARAMS] });

  // /workflows/[activity]/new/[type] is portable; entity selection lives in a
  // per-project wf_* session and resets naturally.
  if (stage === WORKFLOW_NEW_SEGMENT && type) {
    return {
      path: [WorkspaceMainPages.Workflows, activity, WORKFLOW_NEW_SEGMENT, type],
      params: scopeOnly,
    };
  }

  // Any /configure variant (session wf_* id, legacy entity id, or static)
  // carries selections that cannot exist in the target project → restart the
  // same workflow at its selection page, keeping only the scope tab.
  if (stage === WORKFLOW_CONFIGURE_SEGMENT && type) {
    return {
      path: [WorkspaceMainPages.Workflows, activity, WORKFLOW_NEW_SEGMENT, type],
      params: scopeOnly,
    };
  }

  // run/detail views (/workflows/view/...) reference project-scoped ids;
  // anything unrecognized also lands on the workflows home.
  return { path: [WorkspaceMainPages.Workflows], params: new URLSearchParams() };
};

const SECTION_STRATEGIES: Partial<Record<string, SectionStrategy>> = {
  [WorkspaceMainPages.Data]: dataStrategy,
  [WorkspaceMainPages.Notebooks]: notebooksStrategy,
  [WorkspaceMainPages.Reports]: reportsStrategy,
  [WorkspaceMainPages.Workflows]: workflowsStrategy,
};

/**
 * Builds the destination URL for switching to another vlab/project while
 * keeping the user on the equivalent page whenever feasible.
 *
 * Data/notebooks/reports preserve their full location (with a per-section
 * query allowlist); workflows are remapped so project-scoped selections are
 * never carried over; every other page lands on the target project home.
 *
 * @example
 * buildWorkspaceSwitchUrl({
 *   pathname: '/app/virtual-lab/vl-A/proj-A/data/browse/entity/circuit',
 *   searchParams: 'scope=project&h_id=hier-1&s=focused',
 *   targetVirtualLabId: 'vl-B',
 *   targetProjectId: 'proj-B',
 * });
 * // → '/app/virtual-lab/vl-B/proj-B/data/browse/entity/circuit?scope=project&s=focused&h_id=hier-1'
 */
export function buildWorkspaceSwitchUrl({
  pathname,
  searchParams,
  targetVirtualLabId,
  targetProjectId,
}: {
  pathname: string;
  searchParams: URLSearchParams | string;
  targetVirtualLabId: string;
  targetProjectId: string;
}): string {
  const base = `${config.ROOT_ROUTE}/${targetVirtualLabId}/${targetProjectId}`;
  const [section, ...rest] = getRouteSegmentsAfterWorkspace(pathname, config.ROOT_ROUTE);
  const strategy = section ? SECTION_STRATEGIES[section] : undefined;

  if (!strategy) {
    const preserved = getPreservedProjectSection(pathname);
    return preserved ? `${base}/${preserved}` : base;
  }

  const { path, params } = strategy(rest, new URLSearchParams(searchParams));
  const query = params.toString();
  return `${base}/${path.join('/')}${query ? `?${query}` : ''}`;
}
