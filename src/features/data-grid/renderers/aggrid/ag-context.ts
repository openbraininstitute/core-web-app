import type { Facets, GridController, OperatorRegistry } from '../../core';
import type { CellRendererRegistry, DetailRuntime } from '../../react';

/**
 * Object handed to AG Grid as `context`, forwarded to every custom sub-component
 * (header, cell, filter, floating filter, detail row). This is how those
 * AG-managed components reach the headless store and registries without prop
 * drilling.
 */
export interface AgGridContext<Row = unknown> {
  controller: GridController<Row>;
  operators: OperatorRegistry;
  facets?: Facets;
  cellRenderers: CellRendererRegistry;
  detail?: DetailRuntime<Row>;
}
