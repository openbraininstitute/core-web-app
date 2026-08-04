import type { ISelectionSpec } from '../../core';

/** Schema-level selection mode, overridable per render by the picker. */
export type TSchemaSelectionMode = NonNullable<ISelectionSpec['mode']>;

/**
 * Merge the current page's checkboxes into the cross-page selection: `single` replaces
 * everything, `multiRow` preserves ids from pages the grid cannot see. Pure, so it is
 * testable without a live AG Grid.
 */
export function mergePageSelection(
  mode: TSchemaSelectionMode | undefined,
  current: string[],
  pageIds: string[],
  selectedOnPage: string[]
): string[] {
  if (mode === 'single') return selectedOnPage;
  const page = new Set(pageIds);
  const offPage = current.filter((id) => !page.has(id));
  return [...offPage, ...selectedOnPage];
}
