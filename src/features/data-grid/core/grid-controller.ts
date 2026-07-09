import { defaultHiddenColumnIds, resolveColumns } from './domain/resolve-schema';
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

export function createInitialState<Row>(
  schema: GridSchema<Row>,
  defaultPageSize: number
): GridState {
  return {
    filters: {},
    sort: schema.defaultSort ? [...schema.defaultSort] : [],
    page: 1,
    pageSize: defaultPageSize,
    columnOrder: schema.columns.map((c) => c.id),
    hiddenColumns: defaultHiddenColumnIds(schema),
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

    const initial = createInitialState(options.schema, options.defaultPageSize);
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

  /** Build the transport-agnostic request from current state + host params. */
  buildQuery(params?: Record<string, unknown>): GridQuery {
    const s = this.store.getSnapshot();
    return {
      page: s.page,
      pageSize: s.pageSize,
      sort: s.sort,
      filters: s.filters,
      quickFilter: s.quickFilter || undefined,
      params,
    };
  }

  /** Reset to initial defaults (used on species/scope change). */
  resetState(): void {
    this.store.dispatch({
      type: 'reset',
      state: createInitialState(this.schema, this.defaultPageSize),
    });
  }

  dispose(): void {
    this.unsubscribePersistence?.();
  }
}
