import { hydrateFilterTargetIds } from './domain/filter-targets';
import { resolveColumns } from './domain/resolve-schema';
import { GridActionType } from './state/grid-state';
import { GridStateStore } from './state/grid-state-store';

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
      for (const p of persistence) {
        const slice = p.load(instanceKey);
        if (slice) hydrated = { ...hydrated, ...slice };
      }
      // Stored entries predate filter targets: default a missing/stale `targetId`
      // to the column's first target so old snapshots keep resolving to a field.
      hydrated = {
        ...hydrated,
        filters: hydrateFilterTargetIds(hydrated.filters, options.schema),
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

  /** Reset to initial defaults (used on species/scope change). */
  resetState(): void {
    this.store.dispatch({
      type: GridActionType.Reset,
      state: createInitialState(this.schema, this.context, this.defaultPageSize),
    });
  }

  dispose(): void {
    this.unsubscribePersistence?.();
  }
}
