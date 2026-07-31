import type { GridController, OperatorRegistry, TFacets } from '../../core';
import type { CellRendererRegistry, IDetailRuntime } from '../../react';

/**
 * Object handed to AG Grid as `context`, forwarded to every custom sub-component
 * (header, cell, filter, floating filter, detail row). This is how those
 * AG-managed components reach the headless store and registries without prop
 * drilling.
 */
export interface IAgGridContext<Row = unknown> {
  controller: GridController<Row>;
  operators: OperatorRegistry;
  facets?: TFacets;
  cellRenderers: CellRendererRegistry;
  detail?: IDetailRuntime<Row>;
}
