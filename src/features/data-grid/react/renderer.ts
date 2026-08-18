import type { ReactNode } from 'react';
import type {
  GridController,
  IDetailProvider,
  IGridState,
  IResolvedColumn,
  OperatorRegistry,
  TFacets,
} from '@/features/data-grid/core';
import type { CellRendererRegistry } from '@/features/data-grid/react/cell-renderer-registry';

export type TDetailRenderFn<Row> = (args: {
  row: Row;
  data: unknown;
  loading: boolean;
  error: unknown;
  /** live state of the owning grid, so a detail renderer can stay column-consistent */
  state?: IGridState;
}) => ReactNode;

export const ServerGridStateStatus = {
  Idle: 'idle',
  Loading: 'loading',
  Error: 'error',
  Loaded: 'loaded',
} as const;
export type TServerGridStateStatus =
  (typeof ServerGridStateStatus)[keyof typeof ServerGridStateStatus];
/**
 * A server-backed grid's fetch state, derived from the query rather than from the data
 * source, so a cache hit that never runs the fetcher still reports.
 */
export interface IServerGridState {
  status: TServerGridStateStatus;
  total: number;
}

/** Behaviour (provider port) + presentation (render fn) for expandable rows. */
export interface IDetailRuntime<Row> {
  provider: IDetailProvider<Row>;
  render: TDetailRenderFn<Row>;
}

/**
 * Placement for the expand/collapse control of a grid with a {@link IDetailRuntime}.
 * Omitted, the renderer prepends a fixed non-movable leading `__expand` column; with
 * {@link columnId}, the chevron renders inside that data column's cell instead.
 */
export interface IExpandColumnConfig {
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
export interface IGridRendererProps<Row> {
  controller: GridController<Row>;
  columns: Array<IResolvedColumn<Row>>;
  rows: Row[];
  total: number;
  loading: boolean;
  state: IGridState;
  facets?: TFacets;
  operators: OperatorRegistry;
  cellRenderers: CellRendererRegistry;
  detail?: IDetailRuntime<Row>;
  /** whether checkbox multi-row selection is active in the current context */
  selectionEnabled?: boolean;
  /** overrides `schema.selection.mode` for this render: radio vs accumulating checkboxes */
  selectionModeOverride?: 'single' | 'multiRow';
  onRowClick?: (row: Row) => void;
  /** id of the row whose mini-detail view is open — highlighted in the grid */
  activeRowId?: string;
  /** optional per-row css class hook (e.g. hierarchy filtered-in/out styling) */
  getRowClass?: (row: Row) => string | undefined;
  /** optional placement of the expand control (default: fixed leading column) */
  expandColumn?: IExpandColumnConfig;
  /** noun shown in the loading overlay as `loading {label}` (default: `entities`) */
  loadingLabel?: string;
}

/** The rendering port (Strategy). Implemented by `renderers/aggrid`. */
export type TGridRenderer = <Row>(props: IGridRendererProps<Row>) => ReactNode;
