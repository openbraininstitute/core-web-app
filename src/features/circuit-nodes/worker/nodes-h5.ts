import { Dataset, File, Group } from 'h5wasm';
import { match } from 'ts-pattern';

import {
  type ColumnFilter,
  type ColumnKind,
  ColumnKindDict,
  type ColumnMeta,
  type ColumnValues,
  type DerivedColumn,
  type FilterModel,
  type GetRowsRequest,
  type GetRowsResponse,
  type NodeGeometry,
  type NodeGeometryOptions,
  type NumberFilter,
  POSITION_COLUMNS,
  type SortItem,
  type TextFilter,
} from '@/features/circuit-nodes/types';

const SYNTHETIC_NODE_ID = 'node_id';

const ORIENTATION_COLUMNS = [
  'orientation_x',
  'orientation_y',
  'orientation_z',
  'orientation_w',
] as const;
const MORPHOLOGY_COLUMN = 'morphology';

const LOADED_COLUMN_CACHE_SIZE = 12;
const VIEW_CACHE_SIZE = 8;

type CategoricalHandle = {
  kind: 'categorical';
  name: string;
  dataset: Dataset;
  dtype: string;
  library: string[];
  librarySortRank: Uint32Array;
};

type NumericHandle = {
  kind: 'numeric';
  name: string;
  dataset: Dataset;
  dtype: string;
};

type StringHandle = {
  kind: 'string';
  name: string;
  dataset: Dataset;
  dtype: string;
};

type SyntheticNodeIdHandle = {
  kind: 'synthetic-node-id';
  name: string;
};

/** A column handed in whole rather than read from the file; see {@link NodesSession.setDerivedColumns}. */
type DerivedHandle = {
  kind: 'derived';
  name: string;
  values: Float64Array;
};

/** The same, as an index per node into a library of its own. */
type DerivedCategoricalHandle = {
  kind: 'derived-categorical';
  name: string;
  indices: Uint32Array;
  library: string[];
  librarySortRank: Uint32Array;
};

type ColumnHandle =
  | CategoricalHandle
  | NumericHandle
  | StringHandle
  | SyntheticNodeIdHandle
  | DerivedHandle
  | DerivedCategoricalHandle;

type NumericColumn = Float32Array | Float64Array | BigInt64Array | BigUint64Array;

type LoadedColumn = NumericColumn | Uint32Array | string[];

type GenericFilter =
  | TextFilter
  | NumberFilter
  | { filterType: 'text'; operator: 'AND' | 'OR'; conditions: TextFilter[] }
  | { filterType: 'number'; operator: 'AND' | 'OR'; conditions: NumberFilter[] };

type RowTest = (row: number) => boolean;

type Compiled =
  | { kind: 'generic'; test: RowTest }
  | { kind: 'set'; data: Uint32Array; mask: Uint8Array };

function classifyDtype(dtype: string): ColumnKind {
  // h5wasm encodes dtypes using Python `struct` codes (after an optional `<`/`>`/`|` byte-order):
  //   e/f/d        → float16/32/64
  //   b/h/i/q      → int8/16/32/64
  //   B/H/I/Q      → uint8/16/32/64
  //   S<n>         → fixed-length string of n bytes
  // NumPy-style codes (e.g. `<f8`, `<i4`) are tolerated for forward-compatibility.
  if (/^[<>|]?S\d*$/.test(dtype)) return 'string';
  if (/^[<>|]?[efd]\d*$/.test(dtype)) return 'numeric';
  if (/^[<>|]?[bhiqBHIQ]\d*$/.test(dtype)) return 'numeric';
  return 'string';
}

/** A 64-bit integer column, which h5wasm reads as a BigInt64Array or BigUint64Array. */
function isInt64(handle: ColumnHandle): boolean {
  return handle.kind === 'numeric' && /^[<>|]?[qQ]$/.test(handle.dtype);
}

function alphabeticRank(library: string[]): Uint32Array {
  const order = library.map((_, i) => i);
  order.sort((a, b) => library[a].localeCompare(library[b]));
  const rank = new Uint32Array(library.length);
  for (let i = 0; i < order.length; i++) {
    rank[order[i]] = i;
  }
  return rank;
}

function readLibrary(group: Group, name: string): string[] | null {
  const libGroup = group.get('@library');
  if (!(libGroup instanceof Group)) return null;
  const ds = libGroup.get(name);
  if (!(ds instanceof Dataset)) return null;
  const value = ds.value;
  if (Array.isArray(value)) return value.map((v) => String(v));
  if (typeof value === 'string') return [value];
  return null;
}

export class NodesSession {
  file: File;
  filename: string;
  populationKey: string;
  group: Group;
  rowCount: number;
  columns: ColumnMeta[];
  private columnIndex: Map<string, ColumnHandle>;
  private loaded: LruMap<string, LoadedColumn>;
  private viewCache: LruMap<string, Uint32Array>;
  private derivedByOwner = new Map<string, string[]>();

  constructor(filename: string, populationKey: string) {
    this.filename = filename;
    this.populationKey = populationKey;
    this.file = new File(filename, 'r');

    const nodesRoot = this.file.get('nodes');
    if (!(nodesRoot instanceof Group)) {
      throw new Error('Invalid SONATA file: /nodes group not found');
    }
    const popGroup = nodesRoot.get(populationKey);
    if (!(popGroup instanceof Group)) {
      throw new Error(`Population '${populationKey}' not found under /nodes`);
    }
    const group = popGroup.get('0');
    if (!(group instanceof Group)) {
      throw new Error(`Group '/nodes/${populationKey}/0' not found`);
    }
    this.group = group;

    const handles: ColumnHandle[] = [];
    const columnMeta: ColumnMeta[] = [];

    let detectedRowCount: number | null = null;

    for (const key of group.keys()) {
      if (key === '@library' || key === 'dynamics_params') continue;
      const node = group.get(key);
      if (!(node instanceof Dataset)) continue;

      const dtype = String(node.dtype);
      const shape = node.shape;
      const rowCount = shape && shape.length > 0 ? Number(shape[0]) : 0;
      if (detectedRowCount === null && rowCount > 0) detectedRowCount = rowCount;

      const library = readLibrary(group, key);
      if (library) {
        const librarySortRank = alphabeticRank(library);
        const handle: CategoricalHandle = {
          kind: 'categorical',
          name: key,
          dataset: node,
          dtype,
          library,
          librarySortRank,
        };
        handles.push(handle);
        columnMeta.push({ name: key, kind: 'categorical', dtype, library });
        continue;
      }

      const kind = classifyDtype(dtype);
      if (kind === 'numeric') {
        handles.push({ kind: 'numeric', name: key, dataset: node, dtype });
        columnMeta.push({ name: key, kind: 'numeric', dtype });
      } else {
        handles.push({ kind: 'string', name: key, dataset: node, dtype });
        columnMeta.push({ name: key, kind: 'string', dtype });
      }
    }

    // SONATA dynamics_params: per-node biophysical parameters living in a
    // sub-group. Flatten each 1D dataset to a top-level column.
    const dynamicsGroup = group.get('dynamics_params');
    if (dynamicsGroup instanceof Group) {
      const taken = new Set(columnMeta.map((c) => c.name));
      for (const key of dynamicsGroup.keys()) {
        if (taken.has(key)) continue;
        const node = dynamicsGroup.get(key);
        if (!(node instanceof Dataset)) continue;
        const shape = node.shape;
        if (!shape || shape.length !== 1) continue;
        const rowCount = Number(shape[0]);
        if (rowCount === 0) continue;
        if (detectedRowCount !== null && rowCount !== detectedRowCount) continue;
        if (detectedRowCount === null) detectedRowCount = rowCount;

        const dtype = String(node.dtype);
        const kind = classifyDtype(dtype);
        if (kind === 'numeric') {
          handles.push({ kind: 'numeric', name: key, dataset: node, dtype });
          columnMeta.push({ name: key, kind: 'numeric', dtype });
        } else {
          handles.push({ kind: 'string', name: key, dataset: node, dtype });
          columnMeta.push({ name: key, kind: 'string', dtype });
        }
      }
    }

    this.rowCount = detectedRowCount ?? 0;

    // Synthetic node_id column (0-based row index).
    const syntheticHandle: SyntheticNodeIdHandle = {
      kind: 'synthetic-node-id',
      name: SYNTHETIC_NODE_ID,
    };
    const syntheticMeta: ColumnMeta = { name: SYNTHETIC_NODE_ID, kind: 'numeric' };

    this.columns = [syntheticMeta, ...columnMeta];
    this.columnIndex = new Map();
    this.columnIndex.set(SYNTHETIC_NODE_ID, syntheticHandle);
    for (const h of handles) this.columnIndex.set(h.name, h);

    this.loaded = new LruMap(LOADED_COLUMN_CACHE_SIZE);
    this.viewCache = new LruMap(VIEW_CACHE_SIZE);
  }

  close(): void {
    try {
      this.file.close();
    } catch {
      /* ignore */
    }
    this.loaded.clear();
    this.viewCache.clear();
  }

  /**
   * Replace one owner's columns computed outside the file, which page, sort and
   * filter like the file's own once set.
   *
   * By owner, because the session is shared: a simulation's spike statistics
   * and a report's recorded cells can both be on one population, and neither
   * may clear the other's. They live in the column index rather than the LRU,
   * so the table's reads can never evict values nothing could load again, and
   * they stay out of `columns`, which the nodes table elsewhere lists. A name
   * the file or another owner already has is skipped, so a derived column
   * never shadows anything.
   */
  setDerivedColumns(owner: string, columns: DerivedColumn[]): void {
    for (const name of this.derivedByOwner.get(owner) ?? []) this.columnIndex.delete(name);
    const names: string[] = [];
    for (const column of columns) {
      const { name } = column;
      const length = 'values' in column ? column.values.length : column.indices.length;
      if (this.columnIndex.has(name) || length !== this.rowCount) continue;
      this.columnIndex.set(
        name,
        'values' in column
          ? { kind: 'derived', name, values: column.values }
          : {
              kind: 'derived-categorical',
              name,
              indices: column.indices,
              library: column.library,
              librarySortRank: alphabeticRank(column.library),
            }
      );
      names.push(name);
    }
    this.derivedByOwner.set(owner, names);
    // A view sorted or filtered by the old values would page the wrong rows.
    this.viewCache.clear();
  }

  /** The rows a filter model keeps, in node order, or null when it keeps them all. */
  getFilteredIndices(filter: FilterModel): Uint32Array | null {
    const entries = Object.entries(filter).filter(([col]) => this.columnIndex.has(col));
    const viewKey = this.buildViewKey([], entries);
    if (viewKey === null) return null;
    // A copy, so the caller can transfer it without detaching the cached view.
    return this.resolveView(viewKey, [], entries).slice();
  }

  /** The rows a sort and filter show, by node id in their order; null when that is every row in node order. */
  getRowOrder(sort: SortItem[], filter: FilterModel): Uint32Array | null {
    const sortItems = sort.filter((s) => this.columnIndex.has(s.column));
    const filterEntries = Object.entries(filter).filter(([col]) => this.columnIndex.has(col));
    const viewKey = this.buildViewKey(sortItems, filterEntries);
    if (viewKey === null) return null;
    // A copy, so the caller can transfer it without detaching the cached view.
    return this.resolveView(viewKey, sortItems, filterEntries).slice();
  }

  /** Where a node falls among the rows a sort and filter show; -1 where the filter leaves it out. */
  getRowIndex(nodeId: number, sort: SortItem[], filter: FilterModel): number {
    const sortItems = sort.filter((s) => this.columnIndex.has(s.column));
    const filterEntries = Object.entries(filter).filter(([col]) => this.columnIndex.has(col));
    const viewKey = this.buildViewKey(sortItems, filterEntries);
    if (viewKey === null) return nodeId >= 0 && nodeId < this.rowCount ? nodeId : -1;
    return this.resolveView(viewKey, sortItems, filterEntries).indexOf(nodeId);
  }

  getRows(req: GetRowsRequest): GetRowsResponse {
    const { start, end, sort, filter, columns } = req;
    const sortItems = (sort ?? []).filter((s) => this.columnIndex.has(s.column));
    const filterEntries = Object.entries(filter ?? {}).filter(([col]) => this.columnIndex.has(col));

    const viewKey = this.buildViewKey(sortItems, filterEntries);
    const view = viewKey === null ? null : this.resolveView(viewKey, sortItems, filterEntries);

    const total = view ? view.length : this.rowCount;
    const sliceStart = Math.max(0, start);
    const sliceEnd = Math.min(total, Math.max(sliceStart, end));

    const rows: Record<string, string | number>[] = [];
    if (sliceEnd <= sliceStart) return { rows, total };

    // With an identity view we can do narrow hyperslab reads; with a view we
    // need the whole column to gather from.
    const indices: number[] | Uint32Array = view
      ? view.subarray(sliceStart, sliceEnd)
      : range(sliceStart, sliceEnd);

    const pageData: Record<string, (string | number)[]> = {};
    for (const colName of columns) {
      pageData[colName] = this.readColumnPage(
        colName,
        indices,
        view !== null,
        sliceStart,
        sliceEnd
      );
    }

    for (let i = 0; i < sliceEnd - sliceStart; i++) {
      const row: Record<string, string | number> = {};
      for (const colName of columns) {
        row[colName] = pageData[colName][i];
      }
      rows.push(row);
    }

    return { rows, total };
  }

  private buildViewKey(
    sortItems: SortItem[],
    filterEntries: [string, ColumnFilter][]
  ): string | null {
    if (sortItems.length === 0 && filterEntries.length === 0) return null;
    const sortKey = sortItems.map((s) => `${s.column}:${s.direction}`).join('|');
    const filterKey = filterEntries
      .map(([col, f]) => {
        // Set filters are order-independent — canonicalize so reordered selections hit the cache.
        const norm = f.filterType === 'set' ? { ...f, values: [...f.values].sort() } : f;
        return `${col}:${JSON.stringify(norm)}`;
      })
      .sort()
      .join('|');
    return `sort=${sortKey}::filter=${filterKey}`;
  }

  private resolveView(
    viewKey: string,
    sortItems: SortItem[],
    filterEntries: [string, ColumnFilter][]
  ): Uint32Array {
    const cached = this.viewCache.get(viewKey);
    if (cached) return cached;

    let indices: Uint32Array;
    if (filterEntries.length === 0) {
      indices = identityIndices(this.rowCount);
    } else {
      indices = this.applyFilters(filterEntries);
    }
    if (sortItems.length > 0) {
      indices = this.applySort(indices, sortItems);
    }

    this.viewCache.set(viewKey, indices);
    return indices;
  }

  private applyFilters(entries: [string, ColumnFilter][]): Uint32Array {
    const compiled = entries.flatMap((entry): Compiled[] => {
      const [col, f] = entry;
      const handle = this.columnIndex.get(col);
      if (!handle) return [];
      const data = this.loadColumn(col);
      if (f.filterType === 'set') {
        // Set filter is meaningful only on categorical columns; ignore otherwise.
        if (handle.kind !== 'categorical' && handle.kind !== 'derived-categorical') return [];
        const mask = new Uint8Array(handle.library.length);
        const allowed = new Set(f.values);
        for (let i = 0; i < handle.library.length; i++) {
          if (allowed.has(handle.library[i])) mask[i] = 1;
        }
        return [{ kind: 'set', data: data as Uint32Array, mask }];
      }
      return [{ kind: 'generic', test: rowTest(handle, data, f) }];
    });

    const buf = new Uint32Array(this.rowCount);
    let cursor = 0;
    for (let i = 0; i < this.rowCount; i++) {
      let pass = true;
      for (const c of compiled) {
        if (c.kind === 'set') {
          if (c.mask[c.data[i]] !== 1) {
            pass = false;
            break;
          }
        } else if (!c.test(i)) {
          pass = false;
          break;
        }
      }
      if (pass) buf[cursor++] = i;
    }
    return buf.slice(0, cursor);
  }

  private applySort(indices: Uint32Array, sortItems: SortItem[]): Uint32Array {
    const compiled = sortItems.flatMap((s) => {
      const handle = this.columnIndex.get(s.column);
      if (!handle) return [];
      return [{ ...s, handle, data: this.loadColumn(s.column) }];
    });

    const sorted = indices.slice();
    sorted.sort((a, b) => {
      for (const c of compiled) {
        // Blanks last whichever way the column runs: a cell that never fired
        // has no first spike, which is not the same as the earliest one.
        const blank = blankOrder(c.data, a, b);
        if (blank !== 0) return blank;
        const cmp = compareAt(c.handle, c.data, a, b);
        if (cmp !== 0) return c.direction === 'asc' ? cmp : -cmp;
      }
      return a - b;
    });
    return sorted;
  }

  /**
   * Read the whole population's placement in one pass: positions, orientations
   * and — only when asked — the morphology each node points at.
   *
   * Positions are mandatory — a population without x/y/z cannot be drawn, and
   * failing here names the reason rather than painting every cell at the
   * origin. Orientation and morphology are not: a point-neuron population
   * carries neither, and a viewer can still place somas without them.
   *
   * @see NodeGeometryOptions — why both of the optional ones are opt-in.
   */
  getGeometry({
    withMorphologies = false,
    withOrientations = false,
  }: NodeGeometryOptions = {}): NodeGeometry {
    const positions = this.packColumns(POSITION_COLUMNS);
    if (!positions) {
      throw new Error(
        `Population '${this.populationKey}' has no x/y/z columns; nothing to place in 3D`
      );
    }

    const morphologies =
      withMorphologies && this.columnIndex.has(MORPHOLOGY_COLUMN)
        ? this.columnStrings(MORPHOLOGY_COLUMN)
        : null;

    return {
      count: this.rowCount,
      positions,
      orientations: withOrientations ? this.packColumns(ORIENTATION_COLUMNS) : null,
      morphologies,
    };
  }

  /**
   * Interleave whole numeric columns into one flat array, or null if any is
   * missing or is not a number.
   *
   * All-or-nothing because these columns only mean anything together: three of
   * four orientation components is not a partial quaternion, it is no
   * quaternion.
   *
   * The kind is part of that test and not a formality. A `Float32Array` write
   * runs ToNumber on whatever it is given, so a string `x` column would land as
   * `NaN` and a `@library`-encoded one as category indices — both of which draw
   * a circuit rather than reporting that it cannot be drawn.
   */
  private packColumns(names: readonly string[]): Float32Array | null {
    // Checked before any read: loading three of four orientation components
    // only to discard them evicts three entries from a cache the nodes table
    // is sharing.
    if (!names.every((name) => this.columnIndex.get(name)?.kind === 'numeric')) return null;

    // Numeric handles, so `loadColumn` went through `ensureNumericArray`.
    const columns = names.map((name) => this.loadColumn(name) as NumericColumn);

    const stride = names.length;
    const out = new Float32Array(this.rowCount * stride);
    for (let c = 0; c < stride; c++) {
      const column = columns[c];
      if (column instanceof BigInt64Array || column instanceof BigUint64Array) {
        for (let i = 0; i < this.rowCount; i++) out[i * stride + c] = Number(column[i]);
      } else {
        for (let i = 0; i < this.rowCount; i++) out[i * stride + c] = column[i];
      }
    }
    return out;
  }

  private loadColumn(name: string): LoadedColumn {
    const cached = this.loaded.get(name);
    if (cached) return cached;
    const handle = this.columnIndex.get(name);
    if (!handle) throw new Error(`Unknown column '${name}'`);

    if (handle.kind === 'synthetic-node-id') {
      const arr = new Uint32Array(this.rowCount);
      for (let i = 0; i < this.rowCount; i++) arr[i] = i;
      this.loaded.set(name, arr);
      return arr;
    }
    if (handle.kind === 'derived') return handle.values;
    if (handle.kind === 'derived-categorical') return handle.indices;

    const raw = handle.dataset.value;
    let loaded: LoadedColumn;
    if (handle.kind === 'categorical') {
      loaded = ensureUint32(raw);
    } else if (handle.kind === 'numeric') {
      loaded = ensureNumericArray(raw);
    } else {
      loaded = ensureStringArray(raw);
    }
    this.loaded.set(name, loaded);
    return loaded;
  }

  private readColumnPage(
    name: string,
    indices: number[] | Uint32Array,
    useGather: boolean,
    sliceStart: number,
    sliceEnd: number
  ): (string | number)[] {
    const handle = this.columnIndex.get(name);
    if (!handle) return new Array(indices.length).fill('');

    if (handle.kind === 'synthetic-node-id') {
      const out = new Array<number>(indices.length);
      if (useGather) {
        for (let i = 0; i < indices.length; i++) out[i] = (indices as Uint32Array)[i];
      } else {
        for (let i = 0; i < indices.length; i++) out[i] = sliceStart + i;
      }
      return out;
    }

    if (handle.kind === 'derived') {
      const out = new Array<number>(indices.length);
      for (let i = 0; i < indices.length; i++) out[i] = handle.values[indices[i]];
      return out;
    }
    if (handle.kind === 'derived-categorical') {
      const out = new Array<string>(indices.length);
      for (let i = 0; i < indices.length; i++) {
        out[i] = handle.library[handle.indices[indices[i]]] ?? '';
      }
      return out;
    }

    if (!useGather && !this.loaded.has(name) && !isVariableLengthString(handle)) {
      const sliced = handle.dataset.slice([[sliceStart, sliceEnd]]);
      return decodeSliceForPage(handle, sliced);
    }

    const data = this.loadColumn(name);
    const out = new Array<string | number>(indices.length);
    if (handle.kind === 'categorical') {
      const arr = data as Uint32Array;
      const lib = handle.library;
      for (let i = 0; i < indices.length; i++) {
        const idx = (indices as Uint32Array)[i] ?? (indices as number[])[i];
        const libIdx = arr[idx];
        out[i] = lib[libIdx] ?? String(libIdx);
      }
    } else if (handle.kind === 'numeric') {
      const arr = data as NumericColumn;
      // 64-bit integers as exact text, as `decodeSliceForPage` gives them, whatever their size.
      const asText = isInt64(handle);
      for (let i = 0; i < indices.length; i++) {
        const idx = (indices as Uint32Array)[i] ?? (indices as number[])[i];
        out[i] = asText ? String(arr[idx]) : Number(arr[idx]);
      }
    } else {
      const arr = data as string[];
      for (let i = 0; i < indices.length; i++) {
        const idx = (indices as Uint32Array)[i] ?? (indices as number[])[i];
        out[i] = arr[idx] ?? '';
      }
    }
    return out;
  }

  /**
   * read a whole column in node-index order, in the compact form the column
   * cache holds it (see {@link ColumnValues}). The arrays are fresh copies,
   * so a caller may transfer them across the worker boundary without
   * detaching the cache's own.
   *
   * used to color the 3D viewers by a node property (values align 1:1 with
   * the circuit's node index).
   */
  getColumnValues(name: string): ColumnValues {
    const handle = this.columnIndex.get(name);
    if (!handle) return { kind: ColumnKindDict.String, values: [] };

    if (handle.kind === ColumnKindDict.SyntheticNodeId) {
      return { kind: ColumnKindDict.Numeric, values: identityIndices(this.rowCount) };
    }
    if (handle.kind === 'derived') {
      return { kind: ColumnKindDict.Numeric, values: handle.values.slice() };
    }
    if (handle.kind === 'derived-categorical') {
      return {
        kind: ColumnKindDict.Categorical,
        library: handle.library,
        indices: handle.indices.slice(),
      };
    }

    const data = this.loadColumn(name);
    if (handle.kind === ColumnKindDict.Categorical) {
      return {
        kind: ColumnKindDict.Categorical,
        library: handle.library,
        indices: (data as Uint32Array).slice(),
      };
    }
    if (handle.kind === ColumnKindDict.Numeric) {
      const column = data as NumericColumn;
      return {
        kind: ColumnKindDict.Numeric,
        // Numbers: ids past 2^53 lose their last digits, so close ones share a colour.
        values:
          column instanceof BigInt64Array || column instanceof BigUint64Array
            ? Float64Array.from(column, Number)
            : column.slice(),
      };
    }
    return { kind: ColumnKindDict.String, values: [...(data as string[])] };
  }

  /**
   * a column as one string per node. Used by the morphology read, which
   * resolves a file per name and so needs the names themselves. Kept off the
   * {@link getColumnValues} path so colouring a region-scale circuit never
   * materialises a string per node.
   */
  private columnStrings(name: string): string[] {
    const handle = this.columnIndex.get(name);
    if (!handle || handle.kind === ColumnKindDict.SyntheticNodeId) return [];
    // `decodeSliceForPage` owns the per-kind decode, malformed-file fallback
    // included; only numbers still need converting to strings here.
    const decoded = decodeSliceForPage(handle, this.loadColumn(name));
    if (handle.kind !== ColumnKindDict.Numeric) return decoded as string[];
    const values = new Array<string>(decoded.length);
    for (let i = 0; i < decoded.length; i++) values[i] = String(decoded[i]);
    return values;
  }
}

function isVariableLengthString(handle: ColumnHandle): boolean {
  // h5wasm reports variable-length strings as "S" (no size suffix) and
  // fixed-length strings as "S<n>". Dataset.slice() aborts on vlen strings,
  // so route them through the full-column path (Dataset.value), which works.
  return handle.kind === 'string' && handle.dtype === 'S';
}

function range(start: number, end: number): number[] {
  const out = new Array<number>(end - start);
  for (let i = 0; i < out.length; i++) out[i] = start + i;
  return out;
}

function identityIndices(n: number): Uint32Array {
  const arr = new Uint32Array(n);
  for (let i = 0; i < n; i++) arr[i] = i;
  return arr;
}

function ensureUint32(raw: unknown): Uint32Array {
  if (raw instanceof Uint32Array) return raw;
  if (raw instanceof Int32Array || raw instanceof Uint16Array || raw instanceof Int16Array) {
    return Uint32Array.from(raw as ArrayLike<number>);
  }
  if (raw instanceof BigUint64Array || raw instanceof BigInt64Array) {
    const out = new Uint32Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = Number(raw[i]);
    return out;
  }
  if (Array.isArray(raw)) return Uint32Array.from(raw.map((v) => Number(v)));
  return new Uint32Array(0);
}

/** 64-bit integers stay BigInt when any is past 2^53, so that ids such as FlyWire's stay exact. */
function ensureNumericArray(raw: unknown): NumericColumn {
  if (raw instanceof Float64Array) return raw;
  if (raw instanceof Float32Array) return raw;
  if (
    raw instanceof Int32Array ||
    raw instanceof Uint32Array ||
    raw instanceof Int16Array ||
    raw instanceof Uint16Array
  ) {
    return Float64Array.from(raw as ArrayLike<number>);
  }
  if (raw instanceof BigInt64Array || raw instanceof BigUint64Array) {
    const out = new Float64Array(raw.length);
    for (let i = 0; i < raw.length; i++) {
      out[i] = Number(raw[i]);
      if (!Number.isSafeInteger(out[i])) return raw;
    }
    return out;
  }
  if (Array.isArray(raw)) return Float64Array.from(raw.map((v) => Number(v)));
  return new Float64Array(0);
}

function ensureStringArray(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map((v) => String(v));
  if (typeof raw === 'string') return [raw];
  return [];
}

/** A missing value (`NaN`) after a present one; anything else is the column's to order. */
function blankOrder(data: LoadedColumn, a: number, b: number): number {
  if (!(data instanceof Float64Array || data instanceof Float32Array)) return 0;
  const blankA = Number.isNaN(data[a]);
  const blankB = Number.isNaN(data[b]);
  if (blankA === blankB) return 0;
  return blankA ? 1 : -1;
}

function compareAt(handle: ColumnHandle, data: LoadedColumn, a: number, b: number): number {
  if (handle.kind === 'categorical' || handle.kind === 'derived-categorical') {
    const arr = data as Uint32Array;
    const rank = handle.librarySortRank;
    return rank[arr[a]] - rank[arr[b]];
  }
  if (handle.kind === 'numeric' || handle.kind === 'derived') {
    const arr = data as NumericColumn;
    const va = arr[a];
    const vb = arr[b];
    if (va < vb) return -1;
    if (va > vb) return 1;
    return 0;
  }
  if (handle.kind === 'synthetic-node-id') {
    return a - b;
  }
  const arr = data as string[];
  return arr[a].localeCompare(arr[b]);
}

/** A filter as a test on a row, with its bounds parsed and its comparison chosen once, not per row. */
function rowTest(handle: ColumnHandle, data: LoadedColumn, filter: GenericFilter): RowTest {
  if ('operator' in filter) {
    const tests = filter.conditions.map((c) => rowTest(handle, data, c));
    if (tests.length === 0) return () => true;
    if (filter.operator === 'OR') {
      return (row) => {
        for (const test of tests) if (test(row)) return true;
        return false;
      };
    }
    return (row) => {
      for (const test of tests) if (!test(row)) return false;
      return true;
    };
  }
  if (filter.filterType === 'text') {
    const test = textTest(filter);
    return (row) => test(textAt(handle, data, row));
  }
  if (data instanceof BigInt64Array || data instanceof BigUint64Array) {
    const test = integerTest(filter);
    if (test) return (row) => test(data[row]);
  }
  const test = numberTest(filter);
  return (row) => test(numberAt(handle, data, row));
}

function textAt(handle: ColumnHandle, data: LoadedColumn, row: number): string {
  if (handle.kind === 'categorical' || handle.kind === 'derived-categorical') {
    return handle.library[(data as Uint32Array)[row]] ?? '';
  }
  if (handle.kind === 'string') return (data as string[])[row] ?? '';
  if (handle.kind === 'numeric' || handle.kind === 'derived') {
    return String((data as NumericColumn)[row]);
  }
  return String(row);
}

function numberAt(handle: ColumnHandle, data: LoadedColumn, row: number): number {
  if (handle.kind === 'numeric' || handle.kind === 'derived') {
    return Number((data as NumericColumn)[row]);
  }
  if (handle.kind === 'synthetic-node-id') return row;
  if (handle.kind === 'categorical' || handle.kind === 'derived-categorical') {
    return (data as Uint32Array)[row];
  }
  return Number((data as string[])[row]);
}

/** The values of an Equals filter, which matches any of them: "3, 5, 9" for numbers. */
function listedValues(text: string, separator: RegExp = /[\s,;]+/): string[] {
  return text
    .split(separator)
    .map((v) => v.trim())
    .filter((v) => v !== '');
}

function textTest(f: TextFilter): (value: string) => boolean {
  const q = (f.filter ?? '').toLowerCase();
  // Text can hold spaces, so only commas part its values.
  const any = new Set(listedValues(q, /,/));
  return match(f.type)
    .with('contains', () => (v: string) => v.toLowerCase().includes(q))
    .with('equals', () => (v: string) => any.has(v.toLowerCase()))
    .with('notEqual', () => (v: string) => v.toLowerCase() !== q)
    .with('startsWith', () => (v: string) => v.toLowerCase().startsWith(q))
    .with('endsWith', () => (v: string) => v.toLowerCase().endsWith(q))
    .exhaustive();
}

function numberTest(f: NumberFilter): (v: number) => boolean {
  const q = Number(f.filter);
  const q2 = Number(f.filterTo ?? f.filter);
  const lo = Math.min(q, q2);
  const hi = Math.max(q, q2);
  const any = new Set(
    listedValues(f.filter ?? '')
      .map(Number)
      .filter((v) => !Number.isNaN(v))
  );
  return match(f.type)
    .with('equals', () => (v: number) => any.has(v))
    .with('notEqual', () => (v: number) => v !== q)
    .with('lessThan', () => (v: number) => v < q)
    .with('lessThanOrEqual', () => (v: number) => v <= q)
    .with('greaterThan', () => (v: number) => v > q)
    .with('greaterThanOrEqual', () => (v: number) => v >= q)
    .with('inRange', () => (v: number) => v >= lo && v <= hi)
    .exhaustive();
}

/**
 * A number filter as an exact test on 64-bit integers: each bound becomes the whole numbers either
 * side of it, since as a number it would round. Null when a bound is not a decimal ("Infinity").
 */
function integerTest(f: NumberFilter): ((v: bigint) => boolean) | null {
  if (f.type === 'equals') {
    const bounds = listedValues(f.filter).map(wholeBounds);
    if (bounds.length === 0 || bounds.some((b) => b === null)) return null;
    // A value between two whole numbers is no id.
    const ids = new Set(
      (bounds as [bigint, bigint][]).filter(([lo, hi]) => lo === hi).map(([lo]) => lo)
    );
    return (v: bigint) => ids.has(v);
  }
  const a = wholeBounds(f.filter);
  const b = wholeBounds(f.filterTo ?? f.filter);
  if (!a || !b) return null;
  const [floor, ceil] = a;
  const lo = a[1] < b[1] ? a[1] : b[1];
  const hi = a[0] > b[0] ? a[0] : b[0];
  return match(f.type)
    .with('notEqual', () => (floor === ceil ? (v: bigint) => v !== floor : () => true))
    .with('lessThan', () => (v: bigint) => v < ceil)
    .with('lessThanOrEqual', () => (v: bigint) => v <= floor)
    .with('greaterThan', () => (v: bigint) => v > floor)
    .with('greaterThanOrEqual', () => (v: bigint) => v >= ceil)
    .with('inRange', () => (v: bigint) => v >= lo && v <= hi)
    .exhaustive();
}

const ZERO = BigInt(0);
const ONE = BigInt(1);
const DECIMAL = /^([+-]?)(\d*)(?:\.(\d*))?(?:e([+-]?\d+))?$/i;

/** The floor and ceiling of a decimal such as "5.5" or "7.2e17"; null if it is not one. */
function wholeBounds(text: string): [bigint, bigint] | null {
  const m = DECIMAL.exec(text.trim());
  if (!m || (m[2] === '' && !m[3])) return null;
  const [, sign, int, frac = '', exp = '0'] = m;
  const digits = BigInt(int + frac);
  const shift = Number(exp) - frac.length; // the decimal is digits × 10^shift
  let floor: bigint;
  let ceil: bigint;
  if (shift >= 0) {
    // Capped past every 64-bit integer, which is all it is compared with.
    floor = digits * pow10(Math.min(shift, 40));
    ceil = floor;
  } else if (-shift > int.length + frac.length) {
    floor = ZERO; // below 1
    ceil = digits === ZERO ? ZERO : ONE;
  } else {
    const scale = pow10(-shift);
    floor = digits / scale;
    ceil = digits % scale === ZERO ? floor : floor + ONE;
  }
  return sign === '-' ? [-ceil, -floor] : [floor, ceil];
}

function pow10(n: number): bigint {
  return BigInt(`1${'0'.repeat(n)}`);
}

class LruMap<K, V> {
  private map = new Map<K, V>();
  constructor(private capacity: number) {}

  get(key: K): V | undefined {
    const value = this.map.get(key);
    if (value === undefined) return undefined;
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    while (this.map.size > this.capacity) {
      const oldest = this.map.keys().next().value as K | undefined;
      if (oldest === undefined) break;
      this.map.delete(oldest);
    }
  }

  has(key: K): boolean {
    return this.map.has(key);
  }

  clear(): void {
    this.map.clear();
  }
}

function decodeSliceForPage(handle: ColumnHandle, sliced: unknown): (string | number)[] {
  if (handle.kind === 'synthetic-node-id') return [];
  if (handle.kind === 'categorical') {
    const arr = ensureUint32(sliced);
    const lib = handle.library;
    const out = new Array<string>(arr.length);
    for (let i = 0; i < arr.length; i++) out[i] = lib[arr[i]] ?? String(arr[i]);
    return out;
  }
  if (handle.kind === 'numeric') {
    if (sliced instanceof Float64Array || sliced instanceof Float32Array) {
      return Array.from(sliced);
    }
    if (sliced instanceof BigInt64Array || sliced instanceof BigUint64Array) {
      // Exact text, which a number past 2^53 would round.
      return Array.from(sliced, (v) => v.toString());
    }
    if (
      sliced instanceof Int32Array ||
      sliced instanceof Uint32Array ||
      sliced instanceof Int16Array ||
      sliced instanceof Uint16Array
    ) {
      return Array.from(sliced);
    }
    if (Array.isArray(sliced)) return sliced.map((v) => Number(v));
    return [];
  }
  // string
  if (Array.isArray(sliced)) return sliced.map((v) => String(v));
  return [];
}
