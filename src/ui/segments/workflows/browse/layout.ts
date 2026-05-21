/** Reserved height for the multi-entity "Use selection" footer in workflow browse grids. */
export const WORKFLOW_BROWSE_USE_SELECTION_BAR_HEIGHT = '4.5rem';

export function getWorkflowBrowseLayoutClassNames(isMultiEntityBrowse: boolean) {
  return {
    container: isMultiEntityBrowse
      ? `max-h-full min-h-0 flex-1 [grid-area:body] max-h-[calc(100vh-11.8rem-${WORKFLOW_BROWSE_USE_SELECTION_BAR_HEIGHT})]`
      : 'max-h-full min-h-0 flex-1 relative [grid-area:body]',
    miniView: isMultiEntityBrowse
      ? 'max-h-[calc(100vh-11rem)] [grid-area:mini-view] row-span-2 self-stretch'
      : 'max-h-[calc(100vh-11rem)] [grid-area:mini-view]',
    footer: 'flex shrink-0 justify-end bg-background px-4 py-3 [grid-area:footer]',
  };
}
