import type { CellRendererRegistry, IDetailRuntime } from '../../react';
import type { IFilterEditorContext } from '../../react/filters/context';

/**
 * Object handed to AG Grid as `context`, forwarded to every custom sub-component
 * (header, cell, filter, floating filter, detail row). This is how those
 * AG-managed components reach the headless store and registries without prop
 * drilling.
 */
export interface IAgGridContext<Row = unknown> extends IFilterEditorContext<Row> {
  cellRenderers: CellRendererRegistry;
  detail?: IDetailRuntime<Row>;
}
