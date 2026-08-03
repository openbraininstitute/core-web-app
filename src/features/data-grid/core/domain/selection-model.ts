/**
 * PICKER selection mode: how many rows a host form may pick.
 *
 * `Single` renders a radio column (one winner, replaces), `Multi` renders
 * checkboxes (accumulates across pages).
 *
 * NOTE: this is NOT AG Grid's `rowSelection.mode` (`'singleRow' | 'multiRow'`),
 * nor the schema's `ISelectionSpec.mode` — renderers map this dict onto those
 * explicitly.
 */
export const SelectionMode = {
  Single: 'single',
  Multi: 'multi',
} as const;

export type TSelectionMode = (typeof SelectionMode)[keyof typeof SelectionMode];
