import { Dataset, File, Group } from 'h5wasm';
import { match } from 'ts-pattern';

import type {
  ColumnFilter,
  ColumnKind,
  ColumnMeta,
  GetRowsRequest,
  GetRowsResponse,
  NumberFilter,
  SortItem,
  TextFilter,
} from '@/features/circuit-nodes/types';

const SYNTHETIC_NODE_ID = 'node_id';

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
        handles.push({ kind: 'string', name: key, dataset: node, dtype });
        columnMeta.push({ name: key, kind: 'string', dtype });
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
      loaded = ensureUint32(raw);
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

    if (!useGather && !this.loaded.has(name)) {
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
