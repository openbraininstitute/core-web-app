import { Dataset, File, Group } from 'h5wasm';
import { match } from 'ts-pattern';

import {
  type CategoricalDistribution,
  type ColumnDistributionRequest,
  type ColumnDistributionResponse,
  type ColumnFilter,
  type ColumnKind,
  ColumnKindDict,
  type ColumnMeta,
  type ColumnValues,
  type GetRowsRequest,
  type GetRowsResponse,
  type NodeGeometry,
  type NodeGeometryOptions,
  type NumberFilter,
  type NumericDistribution,
  type SortItem,
  type TextFilter,
} from '@/features/circuit-nodes/types';

const SYNTHETIC_NODE_ID = 'node_id';

const POSITION_COLUMNS = ['x', 'y', 'z'] as const;
const ORIENTATION_COLUMNS = [
  'orientation_x',
  'orientation_y',
  'orientation_z',
  'orientation_w',
] as const;
const MORPHOLOGY_COLUMN = 'morphology';

const LOADED_COLUMN_CACHE_SIZE = 12;
const VIEW_CACHE_SIZE = 8;

const AUTO_PROMOTE_MAX_DISTINCT = 100;
const H5_READ_CHUNK_ROWS = 65_536;
// h5wasm 0.7.9 crashes with "memory access out of bounds" inside
// `reclaim_vlen_memory` when `dataset.slice([[start, end]])` is called on a
// variable-length string dataset with a sub-range. For vlen strings we have
// to read the whole column at once via `dataset.value`. We cap the row count
// to keep that one-shot allocation bounded; very large vlen string columns
// are left unprobed and continue to render as raw text columns.
const AUTO_PROMOTE_MAX_ROWS = 1_000_000;

type CategoricalHandle = {
  kind: 'categorical';
  name: string;
  dataset: Dataset;
  dtype: string;
  library: string[];
  librarySortRank: Uint32Array;
  // True when this column was originally string-typed and auto-promoted by the
  // distinct-value probe at session open. The H5 dataset stores raw label
  // strings, not integer indices into @library — readers must reindex.
  isPromoted?: boolean;
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

type ColumnHandle = CategoricalHandle | NumericHandle | StringHandle | SyntheticNodeIdHandle;

type LoadedColumn = Float32Array | Float64Array | Uint32Array | string[];

type GenericFilter =
  | TextFilter
  | NumberFilter
  | { filterType: 'text'; operator: 'AND' | 'OR'; conditions: TextFilter[] }
  | { filterType: 'number'; operator: 'AND' | 'OR'; conditions: NumberFilter[] };

type Compiled =
  | { kind: 'generic'; handle: ColumnHandle; data: LoadedColumn; filter: GenericFilter }
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

function toNumber(v: number | bigint): number {
  return typeof v === 'bigint' ? Number(v) : v;
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

function probeStringColumnForPromotion(dataset: Dataset, rowCount: number): string[] | null {
  if (rowCount === 0) return [];
  if (rowCount > AUTO_PROMOTE_MAX_ROWS) return null;
  const values = ensureStringArray(dataset.value);
  const set = new Set<string>();
  for (let i = 0; i < values.length; i++) {
    set.add(values[i]);
    if (set.size > AUTO_PROMOTE_MAX_DISTINCT) return null;
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
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
        const promotedLibrary = probeStringColumnForPromotion(node, rowCount);
        if (promotedLibrary) {
          const librarySortRank = alphabeticRank(promotedLibrary);
          handles.push({
            kind: 'categorical',
            name: key,
            dataset: node,
            dtype,
            library: promotedLibrary,
            librarySortRank,
            isPromoted: true,
          });
          columnMeta.push({ name: key, kind: 'categorical', dtype, library: promotedLibrary });
        } else {
          handles.push({ kind: 'string', name: key, dataset: node, dtype });
          columnMeta.push({ name: key, kind: 'string', dtype });
        }
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
          const promotedLibrary = probeStringColumnForPromotion(node, rowCount);
          if (promotedLibrary) {
            const librarySortRank = alphabeticRank(promotedLibrary);
            handles.push({
              kind: 'categorical',
              name: key,
              dataset: node,
              dtype,
              library: promotedLibrary,
              librarySortRank,
              isPromoted: true,
            });
            columnMeta.push({ name: key, kind: 'categorical', dtype, library: promotedLibrary });
          } else {
            handles.push({ kind: 'string', name: key, dataset: node, dtype });
            columnMeta.push({ name: key, kind: 'string', dtype });
          }
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
        if (handle.kind !== 'categorical') return [];
        const mask = new Uint8Array(handle.library.length);
        const allowed = new Set(f.values);
        for (let i = 0; i < handle.library.length; i++) {
          if (allowed.has(handle.library[i])) mask[i] = 1;
        }
        return [{ kind: 'set', data: data as Uint32Array, mask }];
      }
      return [{ kind: 'generic', handle, data, filter: f }];
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
        } else if (!matchOne(c.handle, c.data, i, c.filter)) {
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

    // Numeric handles, so `loadColumn` went through `ensureFloatArray`.
    const columns = names.map((name) => this.loadColumn(name) as Float32Array | Float64Array);

    const stride = names.length;
    const out = new Float32Array(this.rowCount * stride);
    for (let c = 0; c < stride; c++) {
      const column = columns[c];
      for (let i = 0; i < this.rowCount; i++) out[i * stride + c] = column[i];
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

    const raw = handle.dataset.value;
    let loaded: LoadedColumn;
    if (handle.kind === 'categorical') {
      loaded = handle.isPromoted
        ? reindexStringsToLibrary(ensureStringArray(raw), handle.library)
        : ensureUint32(raw);
    } else if (handle.kind === 'numeric') {
      loaded = ensureFloatArray(raw);
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

    if (!useGather && !this.loaded.has(name) && !requiresFullColumnRead(handle)) {
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
      const arr = data as Float32Array | Float64Array;
      for (let i = 0; i < indices.length; i++) {
        const idx = (indices as Uint32Array)[i] ?? (indices as number[])[i];
        out[i] = arr[idx];
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

    const data = this.loadColumn(name);
    if (handle.kind === ColumnKindDict.Categorical) {
      return {
        kind: ColumnKindDict.Categorical,
        library: handle.library,
        indices: (data as Uint32Array).slice(),
      };
    }
    if (handle.kind === ColumnKindDict.Numeric) {
      return {
        kind: ColumnKindDict.Numeric,
        values: (data as Float32Array | Float64Array).slice(),
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

  getColumnDistribution(req: ColumnDistributionRequest): ColumnDistributionResponse {
    const { column: colName, filter, topN = 50 } = req;
    const handle = this.columnIndex.get(colName);
    if (!handle) throw new Error(`Unknown column '${colName}'`);

    const filterEntries = Object.entries(filter ?? {}).filter(([col]) => this.columnIndex.has(col));
    const viewKey = this.buildViewKey([], filterEntries);
    const view = viewKey === null ? null : this.resolveView(viewKey, [], filterEntries);

    if (handle.kind === ColumnKindDict.Numeric || handle.kind === ColumnKindDict.SyntheticNodeId) {
      return this.computeNumericDistribution(handle, view);
    }
    if (handle.kind === ColumnKindDict.Categorical) {
      return this.computeCategoricalDistribution(handle, view);
    }
    return this.computeTextDistribution(handle, view, topN);
  }

  private computeNumericDistribution(
    handle: NumericHandle | SyntheticNodeIdHandle,
    view: Uint32Array | null
  ): NumericDistribution {
    let min = Infinity;
    let max = -Infinity;
    let n = 0;
    let nullCount = 0;

    const updateStats = (v: number) => {
      if (Number.isNaN(v)) {
        nullCount++;
        return;
      }
      if (v < min) min = v;
      if (v > max) max = v;
      n++;
    };

    if (handle.kind === ColumnKindDict.SyntheticNodeId) {
      if (view) {
        for (let i = 0; i < view.length; i++) updateStats(view[i]);
      } else if (this.rowCount > 0) {
        min = 0;
        max = this.rowCount - 1;
        n = this.rowCount;
      }
    } else if (view) {
      const data = this.loadColumn(handle.name) as Float32Array | Float64Array;
      for (let i = 0; i < view.length; i++) updateStats(data[view[i]]);
    } else {
      for (let start = 0; start < this.rowCount; start += H5_READ_CHUNK_ROWS) {
        const end = Math.min(this.rowCount, start + H5_READ_CHUNK_ROWS);
        const chunk = ensureFloatArray(handle.dataset.slice([[start, end]]));
        for (let i = 0; i < chunk.length; i++) updateStats(chunk[i]);
      }
    }

    if (n === 0) {
      return { kind: 'numeric', binEdges: [], counts: [], total: 0, nullCount, min: 0, max: 0 };
    }

    let binCount = Math.max(1, Math.min(50, Math.ceil(Math.log2(Math.max(2, n)) + 1)));
    const isInteger =
      handle.kind === ColumnKindDict.SyntheticNodeId || /^[<>|]?[bhiqBHIQ]\d*$/.test(handle.dtype);
    const integerSnapped = isInteger && max - min + 1 <= 50 && max - min + 1 >= 1;
    if (integerSnapped) {
      binCount = Math.max(1, max - min + 1);
    }

    const binEdges: number[] = new Array(binCount + 1);
    if (integerSnapped) {
      for (let i = 0; i <= binCount; i++) binEdges[i] = min - 0.5 + i;
    } else if (min === max) {
      for (let i = 0; i <= binCount; i++) binEdges[i] = min - 0.5 + i / binCount;
    } else {
      const w = (max - min) / binCount;
      for (let i = 0; i <= binCount; i++) binEdges[i] = min + i * w;
    }

    const counts = new Array<number>(binCount).fill(0);
    const lower = binEdges[0];
    const span = binEdges[binCount] - lower;
    const assign = (v: number): number => {
      if (binCount <= 1) return 0;
      const t = (v - lower) / span;
      let idx = Math.floor(t * binCount);
      if (idx < 0) idx = 0;
      else if (idx >= binCount) idx = binCount - 1;
      return idx;
    };

    if (handle.kind === ColumnKindDict.SyntheticNodeId) {
      if (view) {
        for (let i = 0; i < view.length; i++) counts[assign(view[i])]++;
      } else {
        for (let i = 0; i < this.rowCount; i++) counts[assign(i)]++;
      }
    } else if (view) {
      const data = this.loadColumn(handle.name) as Float32Array | Float64Array;
      for (let i = 0; i < view.length; i++) {
        const v = data[view[i]];
        if (!Number.isNaN(v)) counts[assign(v)]++;
      }
    } else {
      for (let start = 0; start < this.rowCount; start += H5_READ_CHUNK_ROWS) {
        const end = Math.min(this.rowCount, start + H5_READ_CHUNK_ROWS);
        const chunk = ensureFloatArray(handle.dataset.slice([[start, end]]));
        for (let i = 0; i < chunk.length; i++) {
          const v = chunk[i];
          if (!Number.isNaN(v)) counts[assign(v)]++;
        }
      }
    }

    return { kind: 'numeric', binEdges, counts, total: n, nullCount, min, max };
  }

  private computeCategoricalDistribution(
    handle: CategoricalHandle,
    view: Uint32Array | null
  ): CategoricalDistribution {
    const counts = new Uint32Array(handle.library.length);
    let total = 0;

    if (view) {
      const data = this.loadColumn(handle.name) as Uint32Array;
      for (let i = 0; i < view.length; i++) counts[data[view[i]]]++;
      total = view.length;
    } else if (handle.isPromoted) {
      // Promoted columns are vlen-string-backed; loadColumn full-reads and
      // reindexes to library, so we can histogram by index directly.
      const data = this.loadColumn(handle.name) as Uint32Array;
      for (let i = 0; i < data.length; i++) counts[data[i]]++;
      total = data.length;
    } else {
      for (let start = 0; start < this.rowCount; start += H5_READ_CHUNK_ROWS) {
        const end = Math.min(this.rowCount, start + H5_READ_CHUNK_ROWS);
        const chunk = ensureUint32(handle.dataset.slice([[start, end]]));
        for (let i = 0; i < chunk.length; i++) {
          const idx = chunk[i];
          if (idx < counts.length) counts[idx]++;
        }
        total += chunk.length;
      }
    }

    const labels: string[] = [];
    const finalCounts: number[] = [];
    for (let i = 0; i < counts.length; i++) {
      if (counts[i] > 0) {
        labels.push(handle.library[i]);
        finalCounts.push(counts[i]);
      }
    }
    return { kind: 'categorical', labels, counts: finalCounts, total };
  }

  private computeTextDistribution(
    handle: StringHandle,
    view: Uint32Array | null,
    topN: number
  ): CategoricalDistribution {
    const map = new Map<string, number>();
    let total = 0;

    if (view) {
      const data = this.loadColumn(handle.name) as string[];
      for (let i = 0; i < view.length; i++) {
        const v = data[view[i]];
        map.set(v, (map.get(v) ?? 0) + 1);
      }
      total = view.length;
    } else {
      // Raw string columns are vlen-backed; full-read once via loadColumn.
      const data = this.loadColumn(handle.name) as string[];
      for (let i = 0; i < data.length; i++) {
        const v = data[i];
        map.set(v, (map.get(v) ?? 0) + 1);
      }
      total = data.length;
    }

    const distinctCount = map.size;
    const entries = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    const limit = Math.max(1, topN);
    const top = entries.slice(0, limit);
    let otherCount = 0;
    for (let i = limit; i < entries.length; i++) otherCount += entries[i][1];

    return {
      kind: 'string',
      labels: top.map(([l]) => l),
      counts: top.map(([, c]) => c),
      total,
      distinctCount,
      otherCount: otherCount > 0 ? otherCount : undefined,
    };
  }
}

function requiresFullColumnRead(handle: ColumnHandle): boolean {
  // h5wasm reports variable-length strings as "S" (no size suffix) and
  // fixed-length strings as "S<n>". Dataset.slice() aborts on vlen strings,
  // so route them through the full-column path (Dataset.value), which works.
  if (handle.kind === ColumnKindDict.String) return handle.dtype === 'S';
  // A promoted categorical is a string dataset read through a library: the
  // column cache holds library indices, but a slice of the dataset hands back
  // the raw strings, so it has to take the full-column path as well.
  return handle.kind === ColumnKindDict.Categorical && handle.isPromoted === true;
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

function ensureFloatArray(raw: unknown): Float32Array | Float64Array {
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
    for (let i = 0; i < raw.length; i++) out[i] = Number(raw[i]);
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

function reindexStringsToLibrary(values: string[], library: string[]): Uint32Array {
  const indexByLabel = new Map<string, number>();
  for (let i = 0; i < library.length; i++) indexByLabel.set(library[i], i);
  const out = new Uint32Array(values.length);
  for (let i = 0; i < values.length; i++) out[i] = indexByLabel.get(values[i]) ?? 0;
  return out;
}

function compareAt(handle: ColumnHandle, data: LoadedColumn, a: number, b: number): number {
  if (handle.kind === 'categorical') {
    const arr = data as Uint32Array;
    const rank = handle.librarySortRank;
    return rank[arr[a]] - rank[arr[b]];
  }
  if (handle.kind === 'numeric') {
    const arr = data as Float32Array | Float64Array;
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

function matchOne(
  handle: ColumnHandle,
  data: LoadedColumn,
  row: number,
  filter: GenericFilter
): boolean {
  if ('operator' in filter) {
    const { operator, conditions } = filter;
    if (conditions.length === 0) return true;
    if (operator === 'OR') {
      for (const c of conditions) if (matchOne(handle, data, row, c)) return true;
      return false;
    }
    for (const c of conditions) if (!matchOne(handle, data, row, c)) return false;
    return true;
  }
  if (filter.filterType === 'text') {
    let value: string;
    if (handle.kind === 'categorical') {
      const arr = data as Uint32Array;
      value = handle.library[arr[row]] ?? '';
    } else if (handle.kind === 'string') {
      value = (data as string[])[row] ?? '';
    } else if (handle.kind === 'numeric') {
      value = String((data as Float32Array | Float64Array)[row]);
    } else {
      value = String(row);
    }
    return matchText(value, filter);
  }
  // number filter
  let num: number;
  if (handle.kind === 'numeric') {
    num = (data as Float32Array | Float64Array)[row];
  } else if (handle.kind === 'synthetic-node-id') {
    num = row;
  } else if (handle.kind === 'categorical') {
    num = (data as Uint32Array)[row];
  } else {
    num = Number((data as string[])[row]);
  }
  return matchNumber(num, filter);
}

function matchText(value: string, f: TextFilter): boolean {
  const v = value.toLowerCase();
  const q = (f.filter ?? '').toLowerCase();
  return match(f.type)
    .with('contains', () => v.includes(q))
    .with('equals', () => v === q)
    .with('notEqual', () => v !== q)
    .with('startsWith', () => v.startsWith(q))
    .with('endsWith', () => v.endsWith(q))
    .exhaustive();
}

function matchNumber(value: number, f: NumberFilter): boolean {
  const q = Number(f.filter);
  return match(f.type)
    .with('equals', () => value === q)
    .with('notEqual', () => value !== q)
    .with('lessThan', () => value < q)
    .with('lessThanOrEqual', () => value <= q)
    .with('greaterThan', () => value > q)
    .with('greaterThanOrEqual', () => value >= q)
    .with('inRange', () => {
      const q2 = Number(f.filterTo ?? q);
      const lo = Math.min(q, q2);
      const hi = Math.max(q, q2);
      return value >= lo && value <= hi;
    })
    .exhaustive();
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
    if (
      sliced instanceof BigInt64Array ||
      sliced instanceof BigUint64Array ||
      sliced instanceof Int32Array ||
      sliced instanceof Uint32Array ||
      sliced instanceof Int16Array ||
      sliced instanceof Uint16Array
    ) {
      const out = new Array<number>(sliced.length);
      for (let i = 0; i < sliced.length; i++) out[i] = toNumber(sliced[i] as number | bigint);
      return out;
    }
    if (Array.isArray(sliced)) return sliced.map((v) => Number(v));
    return [];
  }
  // string
  if (Array.isArray(sliced)) return sliced.map((v) => String(v));
  return [];
}
