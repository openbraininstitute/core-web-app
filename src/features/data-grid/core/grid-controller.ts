import { DEFAULT_PAGE_SIZE_OPTIONS } from '@/features/data-grid/config';
import { pruneAdvancedFilters } from '@/features/data-grid/core/domain/advanced-filters';
import {
  defaultColumnLayout,
  dropPinnedColumns,
  reconcileColumnOrder,
  reconcileHiddenColumns,
} from '@/features/data-grid/core/domain/column-layout';
import { hydrateFilterTargetIds } from '@/features/data-grid/core/domain/filter-targets';
import { resolveColumns } from '@/features/data-grid/core/domain/resolve-schema';
import { GridActionType } from '@/features/data-grid/core/state/grid-state';
import { GridStateStore } from '@/features/data-grid/core/state/grid-state-store';

import type { IStoredColumnLayout } from '@/features/data-grid/core/domain/column-layout';
import type { IGridContext } from '@/features/data-grid/core/domain/grid-context';
import type { IGridQuery } from '@/features/data-grid/core/domain/query';
import type { IResolvedColumn } from '@/features/data-grid/core/domain/resolve-schema';
import type { IGridSchema } from '@/features/data-grid/core/domain/schema';
import type { IStatePersistence } from '@/features/data-grid/core/ports/state-persistence';
import type { IGridState } from '@/features/data-grid/core/state/grid-state';

export interface IGridControllerOptions<Row> {
  schema: IGridSchema<Row>;
  context: IGridContext;
  /** stable key for persistence */
  instanceKey?: string;
  /**
   * Persistence adapters, applied in order. Each owns a slice of state (session:
   * filters/sort/page/search; local: column layout), merged over the schema defaults
   * on load.
   */
  persistence?: IStatePersistence[];
  defaultPageSize: number;
}

/**
 * Pure derivation of the transport-agnostic request from a state snapshot.
 *
 * Standalone rather than only a controller method because of the React Compiler:
 * `controller.buildQuery()` reads the store invisibly and gets memoized against the
 * stable `controller` reference, freezing the query at its first value.
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
  // Resolve first, so contextual order/availability is honoured before any persisted
  // layout is merged on top.
  const resolved = resolveColumns(schema, context);
  return {
    filters: {},
    sort: schema.defaultSort ? [...schema.defaultSort] : [],
    page: 1,
    pageSize: defaultPageSize,
    ...defaultColumnLayout(resolved),
    selection: [],
    expanded: [],
    quickFilter: '',
  };
}

/**
 * Headless owner of the state store: resolves the schema against the context, builds
 * the abstract {@link IGridQuery}, and wires persistence. No data fetching, no
 * rendering.
 */
export class GridController<Row> {
  readonly store: GridStateStore;
  readonly schema: IGridSchema<Row>;
  readonly context: IGridContext;

  private readonly defaultPageSize: number;
  private readonly instanceKey?: string;
  private readonly persistence?: IStatePersistence[];
  private unsubscribePersistence?: () => void;

  constructor(options: IGridControllerOptions<Row>) {
    this.schema = options.schema;
    this.context = options.context;
    this.defaultPageSize = options.defaultPageSize;

    const initial = createInitialState(options.schema, options.context, options.defaultPageSize);
    const { instanceKey, persistence } = options;

    let hydrated = initial;
    if (instanceKey && persistence?.length) {
      // Keep the raw stored layout aside: once merged it is indistinguishable from
      // the schema defaults, and `columnOrder` (which columns the snapshot knew
      // about) has already been overwritten.
      const storedLayout: IStoredColumnLayout = {};
      for (const p of persistence) {
        const slice = p.load(instanceKey);
        if (!slice) continue;
        if (Array.isArray(slice.hiddenColumns)) storedLayout.hiddenColumns = slice.hiddenColumns;
        if (Array.isArray(slice.columnOrder)) storedLayout.columnOrder = slice.columnOrder;
        hydrated = { ...hydrated, ...slice };
      }
      // Both read the RAW `storedLayout`: its `columnOrder` is what says which columns
      // the snapshot knew about, so it must not be widened before `hiddenColumns` is
      // derived from it.
      const declared = resolveColumns(options.schema, options.context);
      hydrated = {
        ...hydrated,
        hiddenColumns: reconcileHiddenColumns(declared, storedLayout),
        columnOrder: reconcileColumnOrder(
          declared.map((c) => c.id),
          dropPinnedColumns(declared, storedLayout.columnOrder)
        ),
      };
      // Repair missing/stale `targetId`s and prune orphaned `adv:…` keys, which
      // would otherwise serialize verbatim as bogus query params.
      hydrated = {
        ...hydrated,
        filters: pruneAdvancedFilters(
          hydrateFilterTargetIds(hydrated.filters, options.schema),
          options.schema
        ),
      };
      // Drop persisted page sizes that are no longer offered (e.g. legacy 50/100).
      // Only after hydration so intentional preset page sizes outside the dropdown
      // (SimpleGrid `pageSize={2}`) are left alone.
      const pageSizeOptions = options.schema.pageSizeOptions ?? [...DEFAULT_PAGE_SIZE_OPTIONS];
      if (!pageSizeOptions.includes(hydrated.pageSize)) {
        hydrated = { ...hydrated, pageSize: options.defaultPageSize, page: 1 };
      }
    }

    this.store = new GridStateStore(hydrated);
    this.instanceKey = instanceKey;
    this.persistence = persistence;
    this.connect();
  }

  /**
   * Start persisting state changes; returns the teardown. Idempotent and callable again
   * after {@link dispose}, so a React host can use it as an effect body — StrictMode's
   * setup → cleanup → setup would otherwise leave a memoised controller disconnected.
   */
  connect(): () => void {
    const instanceKey = this.instanceKey;
    const persistence = this.persistence;
    if (!this.unsubscribePersistence && instanceKey && persistence?.length) {
      this.unsubscribePersistence = this.store.subscribe(() => {
        const snapshot = this.store.getSnapshot();
        for (const p of persistence) p.save(instanceKey, snapshot);
      });
    }
    return () => this.dispose();
  }

  /** Columns visible/filterable in the current context, in canonical order. */
  resolvedColumns(): Array<IResolvedColumn<Row>> {
    return resolveColumns(this.schema, this.context);
  }

  /**
   * Build the transport-agnostic request from current state + host params. Non-React
   * callers only — React code must use {@link buildGridQuery} with the state from
   * `useSyncExternalStore`.
   */
  buildQuery(params?: Record<string, unknown>): IGridQuery {
    return buildGridQuery(this.store.getSnapshot(), params);
  }

  /**
   * Reset the browse state to the schema's defaults (used on species/scope change).
   *
   * The column layout (order, visibility, widths) is deliberately carried over: the
   * reset dispatch runs through the persistence subscription, so dropping it here
   * would write the schema defaults over the user's saved localStorage layout.
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

  /** Restore column order, visibility and widths to the schema defaults, and persist that. */
  resetColumnLayout(): void {
    this.store.dispatch({
      type: GridActionType.Hydrate,
      state: defaultColumnLayout(this.resolvedColumns()),
    });
  }

  /** Stop persisting. {@link connect} can be called again afterwards. */
  dispose(): void {
    this.unsubscribePersistence?.();
    this.unsubscribePersistence = undefined;
  }
}
