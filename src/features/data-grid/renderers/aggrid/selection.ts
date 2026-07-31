import type { SelectionSpec } from '../../core';

/** Effective selection mode: schema-declared, but overridable (picker single/multi). */
export type SelectionMode = NonNullable<SelectionSpec['mode']>;

/**
 * Merge the checkboxes toggled on the CURRENT page into the cross-page selection.
 *
 * - `single` (radio picker): the current page's single pick REPLACES everything —
 *   including any id selected earlier on another page. Radio has one winner.
 * - `multiRow` (default / bulk-actions / multi picker): selection ACCUMULATES across
 *   pages. Ids from other pages (which the grid cannot see) are preserved; this
 *   page's checkboxes are the authority for its own rows.
 *
 * Pure so it is unit-testable without a live AG Grid.
 */
export function mergePageSelection(
  mode: SelectionMode | undefined,
  current: string[],
  pageIds: string[],
  selectedOnPage: string[]
): string[] {
  if (mode === 'single') return selectedOnPage;
  const page = new Set(pageIds);
  const offPage = current.filter((id) => !page.has(id));
  return [...offPage, ...selectedOnPage];
}
