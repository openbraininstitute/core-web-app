import type { GridController, OperatorRegistry, TFacets } from '@/features/data-grid/core';

/**
 * The MINIMUM a filter value editor needs: the headless store to commit into, the
 * operator registry to resolve ui kinds/labels, and the current facet buckets for
 * facet-sourced option lists.
 *
 * Deliberately narrower than the rendering adapter's own context (AG Grid's
 * `IAgGridContext` satisfies it) so the editor is shared by BOTH filter surfaces —
 * the column header popover in the AG Grid ring and the toolbar's advanced-filter
 * menubar in this ring — without the react ring depending on a renderer.
 */
export interface IFilterEditorContext<Row = unknown> {
  controller: GridController<Row>;
  operators: OperatorRegistry;
  facets?: TFacets;
}
