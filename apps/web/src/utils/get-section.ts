import { config } from '@/config';
import { WorkspaceMainPages } from '@/constants';
import { getRouteSegmentsAfterWorkspace } from '@/utils/path';

const preservedMainPages = new Set<string>(Object.values(WorkspaceMainPages));

function getSegmentsAfterWorkspace(pathname: string): string[] {
  return getRouteSegmentsAfterWorkspace(pathname, config.ROOT_ROUTE);
}

/**
 * Returns the active section for a given pathname.
 *
 * Without `section`: returns the top-level section (first segment after workspace ids).
 *   e.g. "/app/virtual-lab/{vlab}/{project}/get-started/tutorials" → "get-started"
 *
 * With `section`: checks if that segment exists in the path after the workspace ids.
 *   e.g. getActiveSection(pathname, "tutorials") → "tutorials" when on /…/get-started/tutorials
 */
export function getActiveSection(pathname: string, section?: string): string | undefined {
  const segments = getSegmentsAfterWorkspace(pathname);

  if (!section) {
    return segments[0] ?? '';
  }

  return segments.includes(section) ? section : undefined;
}

/**
 * Returns the current top-level main page when switching workspaces should
 * keep the user on the same page (data, workflows, notebooks, reports).
 * Nested paths collapse to their parent page; everything else returns null.
 */
export function getPreservedProjectSection(pathname: string): string | null {
  const section = getActiveSection(pathname);
  return section && preservedMainPages.has(section) ? section : null;
}
