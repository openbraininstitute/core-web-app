import { pruneAdvancedFilters } from './domain/advanced-filters';
import { reconcileHiddenColumns } from './domain/column-layout';
import { hydrateFilterTargetIds } from './domain/filter-targets';
import { resolveColumns } from './domain/resolve-schema';
import { GridActionType } from './state/grid-state';
import { GridStateStore } from './state/grid-state-store';

import type { IStoredColumnLayout } from './domain/column-layout';
import type { IGridContext } from './domain/grid-context';
import type { IGridQuery } from './domain/query';
import type { IResolvedColumn } from './domain/resolve-schema';
import type { IGridSchema } from './domain/schema';
import type { IStatePersistence } from './ports/state-persistence';
import type { IGridState } from './state/grid-state';

export interface IGridControllerOptions<Row> {
  schema: IGridSchema<Row>;
  context: IGridContext;
  /** stable key for persistence (the clean successor to the old `dataKey`) */
  instanceKey?: string;
  /**
   * Persistence adapters, applied in order. Each adapter owns a SLICE of state
   * (e.g. session: filters/sort/page/search; local: column layout) — on load the
   * slices are merged over the schema defaults, on save each adapter extracts its
   * own slice from the full state.
   */
  persistence?: IStatePersistence[];
  defaultPageSize: number;
}

/**
 * Pure derivation of the transport-agnostic request from a state snapshot.
 * Kept as a standalone function (not only a controller method) so React code can
 * express the real data flow — `query` derives from the reactive `state` — which
 * matters under the React Compiler: a method call like `controller.buildQuery()`
 * reads the store invisibly and gets memoized against the stable `controller`
 * reference, freezing the query at its first value.
 */
export function buildGridQuery(state: IGridState, params?: Record<string, unknown>): IGridQuery {
  return {
    page: state.page,
    pageSize: state.pageSize,
    sort: state.sort,
    filters: state.filters,
    quickFilter: state.quickFilter || undefined,
    params,
  };
}

export function createInitialState<Row>(
  schema: IGridSchema<Row>,
  context: IGridContext,
  defaultPageSize: number
): IGridState {
  // Default column order & visibility come from the CONTEXT-RESOLVED columns, so
  // contextual `order`/`available`/`hiddenByDefault` are honoured before any
  // persisted user layout is merged on top.
  const resolved = resolveColumns(schema, context);
  return {
    filters: {},
    sort: schema.defaultSort ? [...schema.defaultSort] : [],
    page: 1,
    pageSize: defaultPageSize,
    columnOrder: resolved.map((c) => c.id),
    hiddenColumns: resolved.filter((c) => c.hiddenByDefaultResolved).map((c) => c.id),
    columnWidths: {},
    selection: [],
    expanded: [],
    quickFilter: '',
  };
}

/**
 * The headless "brain": owns the state store, resolves the schema against the
 * context, builds the abstract {@link IGridQuery}, and wires persistence. It holds
 * NO data-fetching logic (that lives in the React ring via React Query) and NO
 * rendering — keeping it pure and unit-testable.
 */
export class GridController<Row> {
  readonly store: GridStateStore;
  readonly schema: IGridSchema<Row>;
  readonly context: IGridContext;

  private readonly defaultPageSize: number;
  private unsubscribePersistence?: () => void;

  constructor(options: IGridControllerOptions<Row>) {
    this.schema = options.schema;
    this.context = options.context;
    this.defaultPageSize = options.defaultPageSize;

    const initial = createInitialState(options.schema, options.context, options.defaultPageSize);
    const { instanceKey, persistence } = options;

    let hydrated = initial;
    if (instanceKey && persistence?.length) {
      // The RAW stored layout is kept aside: once merged, a stored `hiddenColumns`
      // is indistinguishable from the schema's defaults, and the stored
      // `columnOrder` — which is what tells us WHICH columns that snapshot knew
      // about — has already been overwritten.
      const storedLayout: IStoredColumnLayout = {};
      for (const p of persistence) {
        const slice = p.load(instanceKey);
        if (!slice) continue;
        if (Array.isArray(slice.hiddenColumns)) storedLayout.hiddenColumns = slice.hiddenColumns;
        if (Array.isArray(slice.columnOrder)) storedLayout.columnOrder = slice.columnOrder;
        hydrated = { ...hydrated, ...slice };
      }
      // A column the stored snapshot never saw falls back to its resolved
      // `hiddenByDefault` — otherwise a newly-declared hidden-by-default column
      // would show up for every user who already has a saved layout.
      hydrated = {
        ...hydrated,
        hiddenColumns: reconcileHiddenColumns(
          resolveColumns(options.schema, options.context),
          storedLayout
        ),
      };
      // Stored entries predate filter targets: default a missing/stale `targetId`
      // to the column's first target so old snapshots keep resolving to a field.
      // Advanced-filter entries are pruned in the same pass — an orphaned `adv:…`
      // key would otherwise be serialized verbatim as a bogus query param.
      hydrated = {
        ...hydrated,
        filters: pruneAdvancedFilters(
          hydrateFilterTargetIds(hydrated.filters, options.schema),
          options.schema
        ),
      };
    }

    this.store = new GridStateStore(hydrated);

    if (instanceKey && persistence?.length) {
      this.unsubscribePersistence = this.store.subscribe(() => {
        const snapshot = this.store.getSnapshot();
        for (const p of persistence) p.save(instanceKey, snapshot);
      });
    }
  }

  /** Columns visible/filterable in the current context, in canonical order. */
  resolvedColumns(): Array<IResolvedColumn<Row>> {
    return resolveColumns(this.schema, this.context);
  }

  /**
   * Build the transport-agnostic request from current state + host params.
   * Non-React callers only — React code must use {@link buildGridQuery} with the
   * state from `useSyncExternalStore` (see its doc for the React Compiler pitfall).
   */
  buildQuery(params?: Record<string, unknown>): IGridQuery {
    return buildGridQuery(this.store.getSnapshot(), params);
  }

  /**
   * Reset the BROWSE state to the schema's defaults (used on species/scope change).
   *
   * The user's column LAYOUT — order, visibility, widths — is deliberately carried
   * over. It is a lasting preference (persisted to localStorage, see the layout
   * slice) rather than part of the transient browse state this reset exists for, so
   * dropping it here would not merely re-show the columns: the reset dispatch runs
   * through the persistence subscription, which would then write the schema
   * defaults OVER the saved layout — destroying it for every future session and
   * every other tab. Which columns are AVAILABLE in the new context is not this
   * method's business either; that comes from re-resolving the schema against the
   * new context (the host rebuilds the controller when the context changes) and
   * from `reconcileHiddenColumns` on the way back in.
   */
  resetState(): void {
    const { columnOrder, hiddenColumns, columnWidths } = this.store.getSnapshot();
    this.store.dispatch({
      type: GridActionType.Reset,
      state: {
        ...createInitialState(this.schema, this.context, this.defaultPageSize),
        columnOrder,
        hiddenColumns,
        columnWidths,
      },
    });
  }

  dispose(): void {
    this.unsubscribePersistence?.();
  }
}
