/**
 * Transition types dispatched by the top-menu tab links and consumed by the
 * workspace <ViewTransition> in the project layout: navigating to a tab
 * further right in the toolbar slides the section forward (in from the
 * right), further left slides it back (in from the left).
 */
export const WORKSPACE_NAV_FORWARD = 'workspace-nav-forward';
export const WORKSPACE_NAV_BACK = 'workspace-nav-back';

/**
 * View-transition class map that plays `className` on regular in-section
 * transitions but sits out the workspace tab slide, which animates the whole
 * section container instead.
 */
export function unlessWorkspaceNav(className: string) {
  return {
    [WORKSPACE_NAV_FORWARD]: 'none',
    [WORKSPACE_NAV_BACK]: 'none',
    default: className,
  };
}
