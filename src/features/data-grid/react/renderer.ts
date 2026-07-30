import type { ReactNode } from 'react';
import type {
  DetailProvider,
  Facets,
  GridController,
  GridState,
  OperatorRegistry,
  ResolvedColumn,
} from '../core';
import type { CellRendererRegistry } from './cell-renderer-registry';

export type DetailRenderFn<Row> = (args: {
  row: Row;
  data: unknown;
  loading: boolean;
  error: unknown;
}) => ReactNode;

/** Behaviour (provider port) + presentation (render fn) for expandable rows. */
export interface DetailRuntime<Row> {
  provider: DetailProvider<Row>;
  render: DetailRenderFn<Row>;
}

/**
 * Everything a rendering substrate needs to draw the grid and emit state changes.
 * State is mutated exclusively through `controller.store.dispatch`, so any renderer
 * (AG Grid today, something else tomorrow) stays a thin, swappable adapter.
 */
export interface GridRendererProps<Row> {
  controller: GridController<Row>;
  columns: Array<ResolvedColumn<Row>>;
  rows: Row[];
  total: number;
  loading: boolean;
  state: GridState;
  facets?: Facets;
  operators: OperatorRegistry;
  cellRenderers: CellRendererRegistry;
  detail?: DetailRuntime<Row>;
  /** whether checkbox multi-row selection is active in the current context */
  selectionEnabled?: boolean;
  onRowClick?: (row: Row) => void;
  /** id of the row whose mini-detail view is open — highlighted in the grid */
  activeRowId?: string;
}

/** The rendering port (Strategy). Implemented by `renderers/aggrid`. */
export type GridRenderer = <Row>(props: GridRendererProps<Row>) => ReactNode;
