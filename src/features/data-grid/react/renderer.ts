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
  /**
   * Live grid state of the owning grid (optional, additive). Lets a detail renderer
   * stay column-consistent with the parent — e.g. the circuit plugin filters its
   * nested subcircuit grid by the parent's `hiddenColumns`. Existing renderers that
   * ignore it are unchanged.
   */
  state?: GridState;
}) => ReactNode;

/** Behaviour (provider port) + presentation (render fn) for expandable rows. */
export interface DetailRuntime<Row> {
  provider: DetailProvider<Row>;
  render: DetailRenderFn<Row>;
}

/**
 * Configurable placement for the expand/collapse control of a grid that has a
 * {@link DetailRuntime}. By default (config omitted) the renderer prepends a fixed,
 * non-movable leading `__expand` column — the historical behaviour. When
 * {@link columnId} is supplied the chevron renders INSIDE that data column's cell
 * (right-aligned by default, vertically centred), and no leading column is added.
 * Renderer-agnostic on purpose so it can be honoured by any rendering strategy.
 */
export interface ExpandColumnConfig {
  /** id of the data column that hosts the expander; omit for a leading column. */
  columnId?: string;
  /** within-cell alignment when {@link columnId} is set (default: 'right'). */
  align?: 'left' | 'right';
  /** custom expander glyph; receives the open state (default: chevron right/down). */
  renderExpander?: (open: boolean) => ReactNode;
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
  /**
   * Overrides the schema's `selection.mode` for the current render (picker mode).
   * `'single'` = radio (one winner, replace); `'multiRow'` = checkboxes (accumulate).
   * When omitted the renderer falls back to `schema.selection.mode`.
   */
  selectionModeOverride?: 'single' | 'multiRow';
  onRowClick?: (row: Row) => void;
  /** id of the row whose mini-detail view is open — highlighted in the grid */
  activeRowId?: string;
  /** optional per-row css class hook (e.g. hierarchy filtered-in/out styling) */
  getRowClass?: (row: Row) => string | undefined;
  /** optional placement of the expand control (default: fixed leading column) */
  expandColumn?: ExpandColumnConfig;
}

/** The rendering port (Strategy). Implemented by `renderers/aggrid`. */
export type GridRenderer = <Row>(props: GridRendererProps<Row>) => ReactNode;
