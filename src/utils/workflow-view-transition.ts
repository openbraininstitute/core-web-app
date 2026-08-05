import { config } from '@/config';
import { WorkspaceSection } from '@/constants';
import { getRouteSegmentsAfterWorkspace } from '@/utils/path';

/**
 * Transition types for the workflow drill-down flow, consumed by the
 * <ViewTransition> in workflow-flow-transition.tsx: stepping deeper (start →
 * entity selection → scan config) slides down, stepping back slides up.
 */
export const WORKFLOW_NAV_DOWN = 'workflow-nav-down';
export const WORKFLOW_NAV_UP = 'workflow-nav-up';

/**
 * Depth of a pathname in the workflow drill-down flow: 0 = start page
 * (category/type selection), 1 = entity selection ({activity}/new/…),
 * 2 = scan config ({activity}/configure/…). null when outside the flow
 * (e.g. workflow data views).
 */
export function getWorkflowFlowLevel(pathname: string): number | null {
  const [section, , stage] = getRouteSegmentsAfterWorkspace(pathname, config.ROOT_ROUTE);

  if (section !== WorkspaceSection.GeneralWorkflow) return null;
  if (stage === undefined) return 0;
  if (stage === 'new') return 1;
  if (stage === 'configure') return 2;
  return null;
}
