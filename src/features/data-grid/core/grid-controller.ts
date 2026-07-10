import { resolveColumns } from './domain/resolve-schema';
import { GridStateStore } from './state/grid-state-store';

import type { GridContext } from './domain/grid-context';
import type { GridQuery } from './domain/query';
import type { ResolvedColumn } from './domain/resolve-schema';
import type { GridSchema } from './domain/schema';
import type { StatePersistence } from './ports/state-persistence';
import type { GridState } from './state/grid-state';

export interface GridControllerOptions<Row> {
  schema: GridSchema<Row>;
  context: GridContext;
  /** stable key for persistence (the clean successor to the old `dataKey`) */
  instanceKey?: string;
  /**
   * Persistence adapters, applied in order. Each adapter owns a SLICE of state
   * (e.g. session: filters/sort/page/search; local: column layout) — on load the
   * slices are merged over the schema defaults, on save each adapter extracts its
   * own slice from the full state.
   */
  persistence?: StatePersistence[];
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
export function buildGridQuery(state: GridState, params?: Record<string, unknown>): GridQuery {
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
  schema: GridSchema<Row>,
  context: GridContext,
  defaultPageSize: number
): GridState {
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
 * context, builds the abstract {@link GridQuery}, and wires persistence. It holds
 * NO data-fetching logic (that lives in the React ring via React Query) and NO
 * rendering — keeping it pure and unit-testable.
 */
export class GridController<Row> {
  readonly store: GridStateStore;
  readonly schema: GridSchema<Row>;
  readonly context: GridContext;

  private readonly defaultPageSize: number;
  private unsubscribePersistence?: () => void;

  constructor(options: GridControllerOptions<Row>) {
    this.schema = options.schema;
    this.context = options.context;
    this.defaultPageSize = options.defaultPageSize;

    const initial = createInitialState(options.schema, options.context, options.defaultPageSize);
    const { instanceKey, persistence } = options;

    let hydrated = initial;
    if (instanceKey && persistence?.length) {
      for (const p of persistence) {
        const slice = p.load(instanceKey);
        if (slice) hydrated = { ...hydrated, ...slice };
      }
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
  resolvedColumns(): Array<ResolvedColumn<Row>> {
    return resolveColumns(this.schema, this.context);
  }

  /**
   * Build the transport-agnostic request from current state + host params.
   * Non-React callers only — React code must use {@link buildGridQuery} with the
   * state from `useSyncExternalStore` (see its doc for the React Compiler pitfall).
   */
  buildQuery(params?: Record<string, unknown>): GridQuery {
    return buildGridQuery(this.store.getSnapshot(), params);
  }

  /** Reset to initial defaults (used on species/scope change). */
  resetState(): void {
    this.store.dispatch({
      type: 'reset',
      state: createInitialState(this.schema, this.context, this.defaultPageSize),
    });
  }

  dispose(): void {
    this.unsubscribePersistence?.();
  }
}
