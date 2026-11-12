import type { CellRendererRegistry, IDetailRuntime } from '@/features/data-grid/react';
import type { IFilterEditorContext } from '@/features/data-grid/react/filters/context';

/**
 * Object handed to AG Grid as `context`, forwarded to every custom sub-component
 * (header, cell, filter, floating filter, detail row). This is how those
 * AG-managed components reach the headless store and registries without prop
 * drilling.
 */
export interface IAgGridContext<Row = unknown> extends IFilterEditorContext<Row> {
  cellRenderers: CellRendererRegistry;
  detail?: IDetailRuntime<Row>;
  /**
   * Watches the content of a cell in a column sized to its content, refitting the column
   * when that content changes width (a badge its own request brings). Returns the unwatch.
   */
  watchFittedCell?: (content: Element) => () => void;
}
