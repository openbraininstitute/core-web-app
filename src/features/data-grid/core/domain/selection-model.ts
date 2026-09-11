/**
 * Picker selection mode: `Single` renders a radio column, `Multi` renders checkboxes
 * accumulating across pages. Not AG Grid's `rowSelection.mode` nor the schema's
 * `ISelectionSpec.mode` — renderers map onto those explicitly.
 */
export const SelectionMode = {
  Single: 'single',
  Multi: 'multi',
} as const;

export const selectionScope = {
  Isolated: 'isolated',
  Shared: 'shared',
} as const;

export type TSelectionMode = (typeof SelectionMode)[keyof typeof SelectionMode];
export type TSelectionScope = (typeof selectionScope)[keyof typeof selectionScope];
