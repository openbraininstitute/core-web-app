import { Dataset, File, Group, Module } from 'h5wasm';

import type { Metadata } from 'h5wasm';

/** Where ConnectomeUtilities keeps a matrix in its file. */
const MATRIX = 'connectivity/full_matrix';

/** h5wasm's type classes, as its metadata numbers them. */
const INTEGER = 0;
const FLOAT = 1;
const STRING = 3;
const ARRAY = 10;

/** Connections read at a time: big enough to be quick, small enough not to double the heap. */
const EDGE_CHUNK = 1 << 20;

/**
 * A neuron property of the matrix: a library and a code per neuron (-1 for none),
 * kept in the library's order where `ordered`, such as ranges of a number; or a number.
 */
export type VertexProperty =
  | { name: string; kind: 'categorical'; library: string[]; codes: Int32Array; ordered?: boolean }
  | { name: string; kind: 'numeric'; values: Float64Array };

/**
 * A circuit's connectivity matrix: its neurons, row and column i alike, and a
 * presynaptic and postsynaptic neuron per connection, with its synapses.
 */
export type ConnectivityMatrix = {
  size: number;
  nodeIds: Float64Array;
  properties: VertexProperty[];
  pre: Uint32Array;
  post: Uint32Array;
  /** What the matrix holds per connection, where it is a number: its synapses. */
  synapses: Float32Array | null;
};

class UnreadableMatrixError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnreadableMatrixError';
  }
}

/** A dataset's rows `start` to `start + count`, as the file lays out their bytes. */
function readRows(dataset: Dataset, start: number, count: number): Uint8Array {
  const { shape, size } = dataset.metadata;
  if (!shape || count === 0) return new Uint8Array(0);
  const inner = shape.slice(1);
  const nbytes = size * count * inner.reduce((a, b) => a * b, 1);
  const ptr = Module._malloc(nbytes);
  if (!ptr) throw new Error(`Could not allocate ${nbytes} bytes to read ${dataset.path}`);
  try {
    Module.get_dataset_data(
      dataset.file_id,
      dataset.path,
      [count, ...inner].map(BigInt),
      [start, ...inner.map(() => 0)].map(BigInt),
      [1, ...inner.map(() => 1)].map(BigInt),
      BigInt(ptr)
    );
    return Module.HEAPU8.slice(ptr, ptr + nbytes);
  } finally {
    Module._free(ptr);
  }
}

/** A number of a scalar type at `offset`, 64-bit integers by their two halves. */
function numberAt(view: DataView, offset: number, type: Metadata): number {
  if (type.type === FLOAT) {
    return type.size === 4 ? view.getFloat32(offset, true) : view.getFloat64(offset, true);
  }
  switch (type.size) {
    case 1:
      return type.signed ? view.getInt8(offset) : view.getUint8(offset);
    case 2:
      return type.signed ? view.getInt16(offset, true) : view.getUint16(offset, true);
    case 4:
      return type.signed ? view.getInt32(offset, true) : view.getUint32(offset, true);
    default: {
      const low = view.getUint32(offset, true);
      const high = type.signed ? view.getInt32(offset + 4, true) : view.getUint32(offset + 4, true);
      return high * 2 ** 32 + low;
    }
  }
}

const decoder = new TextDecoder();

/** A fixed-length string, cut at its first null. */
function stringAt(bytes: Uint8Array, offset: number, size: number): string {
  const field = bytes.subarray(offset, offset + size);
  const end = field.indexOf(0);
  return decoder.decode(end < 0 ? field : field.subarray(0, end));
}

function attribute(object: Dataset | Group, name: string): unknown {
  return object.attrs[name]?.value;
}

/** A scalar attribute's value, which h5wasm can hand over as an array of one. */
function scalarOf(value: unknown): unknown {
  return ArrayBuffer.isView(value) || Array.isArray(value)
    ? (value as ArrayLike<unknown>)[0]
    : value;
}

/** Text, from an attribute h5wasm hands over as a string or as bytes. */
function textOf(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (value instanceof Uint8Array) return decoder.decode(value);
  return null;
}

/**
 * The names in a list pickled at protocol 0, as pandas keeps a block's columns:
 * `(lp0\nVx\np1\naVy\np2\na.` is x and y.
 */
export function pickledNames(pickle: string): string[] {
  return pickle
    .split('\n')
    .flatMap((line) => {
      const match = /^a?V(.*)$/.exec(line);
      return match ? [match[1]] : [];
    })
    .map((name) =>
      name.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex: string) =>
        String.fromCharCode(Number.parseInt(hex, 16))
      )
    );
}

/** A table of pandas' categories: its values, in order, as text. */
function readLibrary(file: File, path: string): string[] | null {
  const table = file.get(path);
  if (!(table instanceof Dataset)) return null;
  const { shape, size, compound_type: compound } = table.metadata;
  const member = compound?.members.find((m) => m.name === 'values');
  if (!shape || !member) return null;
  const bytes = readRows(table, 0, shape[0]);
  const view = new DataView(bytes.buffer);
  return Array.from({ length: shape[0] }, (_, row) => {
    const offset = row * size + member.offset;
    return member.type === STRING
      ? stringAt(bytes, offset, member.size)
      : String(numberAt(view, offset, member));
  });
}

/**
 * The neurons' properties, from the table pandas writes in its `table` format:
 * one row per neuron, its node id the index and its columns in blocks by kind,
 * a categorical one as codes into a table of its own.
 */
function readVertices(file: File): Pick<ConnectivityMatrix, 'size' | 'nodeIds' | 'properties'> {
  const path = `${MATRIX}/vertex_properties`;
  const table = file.get(`${path}/table`);
  if (!(table instanceof Dataset) || !table.metadata.compound_type) {
    throw new UnreadableMatrixError('The matrix has no table of its neurons');
  }
  const { shape, size: rowSize, compound_type: compound } = table.metadata;
  const size = shape?.[0] ?? 0;
  const bytes = readRows(table, 0, size);
  const view = new DataView(bytes.buffer);
  const nodeIds = Float64Array.from({ length: size }, (_, i) => i);
  const properties: VertexProperty[] = [];

  for (const member of compound.members) {
    const element = member.type === ARRAY && member.array_type ? member.array_type : member;
    const width = member.type === ARRAY ? Math.round(member.size / element.size) : 1;
    const at = (row: number, k: number) => row * rowSize + member.offset + k * element.size;
    if (member.name === 'index') {
      if (element.type === INTEGER || element.type === FLOAT) {
        for (let row = 0; row < size; row++) nodeIds[row] = numberAt(view, at(row, 0), element);
      }
      continue;
    }
    const names = pickledNames(textOf(attribute(table, `${member.name}_kind`)) ?? '');
    const category = textOf(attribute(table, `${member.name}_meta`)) === 'category';
    const library = category ? readLibrary(file, `${path}/meta/${member.name}/meta/table`) : null;
    for (let k = 0; k < width; k++) {
      const name = names[k] ?? (width === 1 ? member.name : `${member.name}_${k}`);
      if (library && element.type === INTEGER) {
        const codes = Int32Array.from({ length: size }, (_, row) => {
          const code = numberAt(view, at(row, k), element);
          return code >= 0 && code < library.length ? code : -1;
        });
        properties.push({ name, kind: 'categorical', library, codes });
      } else if (element.type === STRING) {
        // Text kept as text: a category per value it takes.
        const index = new Map<string, number>();
        const codes = Int32Array.from({ length: size }, (_, row) => {
          const value = stringAt(bytes, at(row, k), element.size);
          let code = index.get(value);
          if (code === undefined) {
            code = index.size;
            index.set(value, code);
          }
          return code;
        });
        properties.push({ name, kind: 'categorical', library: [...index.keys()], codes });
      } else if (element.type === INTEGER || element.type === FLOAT) {
        const values = Float64Array.from({ length: size }, (_, row) =>
          numberAt(view, at(row, k), element)
        );
        properties.push({ name, kind: 'numeric', values });
      }
    }
  }
  return { size, nodeIds, properties };
}

/**
 * Where a column of a frame pandas wrote in its `fixed` format lies: the block
 * holding it, which is stored a row per connection, and the column it is there.
 */
function frameColumn(file: File, frame: string, column: string) {
  const group = file.get(`${MATRIX}/${frame}`);
  if (!(group instanceof Group)) return null;
  const blocks = Number(scalarOf(attribute(group, 'nblocks')) ?? 1);
  for (let block = 0; block < blocks; block++) {
    const items = file.get(`${MATRIX}/${frame}/block${block}_items`);
    const values = file.get(`${MATRIX}/${frame}/block${block}_values`);
    if (!(items instanceof Dataset) || !(values instanceof Dataset)) continue;
    const names = ([] as unknown[]).concat(items.value).map((n) => textOf(n) ?? String(n));
    const index = names.indexOf(column);
    if (index >= 0) return { values, index };
  }
  return null;
}

/**
 * A column of a `fixed` frame, a value per connection, read a chunk at a time
 * into `into`, which holds one per connection. A frame of none leaves it be.
 */
function readFrameColumn(
  located: { values: Dataset; index: number },
  into: Uint32Array | Float32Array
): void {
  const { values, index } = located;
  const { metadata } = values;
  const { shape, size, type } = metadata;
  if (type !== INTEGER && type !== FLOAT) {
    throw new UnreadableMatrixError(
      'The matrix keeps its connections in a form the browser cannot read'
    );
  }
  const count = into.length;
  // Pandas stores an empty frame as a placeholder of another shape.
  if (count === 0 || !shape || shape.length !== 2 || shape[0] !== count) return;
  const width = shape[1];
  for (let start = 0; start < count; start += EDGE_CHUNK) {
    const rows = Math.min(EDGE_CHUNK, count - start);
    const view = new DataView(readRows(values, start, rows).buffer);
    for (let row = 0; row < rows; row++) {
      into[start + row] = numberAt(view, (row * width + index) * size, metadata);
    }
  }
}

/** How many connections a `fixed` frame holds: the length of its index. */
function frameRows(file: File, frame: string): number {
  const axis = file.get(`${MATRIX}/${frame}/axis1`);
  return axis instanceof Dataset ? (axis.shape?.[0] ?? 0) : 0;
}

/**
 * Read a ConnectomeUtilities connectivity matrix, as obi-one's extraction
 * writes one for a circuit's `circuit_connectivity_matrices` asset.
 */
export function readConnectivityMatrix(filename: string): ConnectivityMatrix {
  const file = new File(filename, 'r');
  try {
    const group = file.get(MATRIX);
    if (!(group instanceof Group)) {
      throw new UnreadableMatrixError('The file holds no ConnectomeUtilities matrix');
    }
    const shape = Array.from(
      (attribute(group, 'NEUROTOP_SHAPE') as ArrayLike<number | bigint> | undefined) ?? [],
      Number
    );
    if (shape.length === 2 && shape[0] !== shape[1]) {
      throw new UnreadableMatrixError('The matrix is not square, so has no one set of neurons');
    }
    const vertices = readVertices(file);
    const count = frameRows(file, 'edge_indices');
    const rows = frameColumn(file, 'edge_indices', 'row');
    const cols = frameColumn(file, 'edge_indices', 'col');
    if (!rows || !cols) throw new UnreadableMatrixError('The matrix lists no connections');
    const pre = new Uint32Array(count);
    const post = new Uint32Array(count);
    readFrameColumn(rows, pre);
    readFrameColumn(cols, post);

    const edge = textOf(attribute(group, 'NEUROTOP_DEFAULT_EDGE'));
    const weights = edge ? frameColumn(file, 'edges', edge) : null;
    let synapses: Float32Array | null = null;
    if (weights && frameRows(file, 'edges') === count) {
      synapses = new Float32Array(count);
      readFrameColumn(weights, synapses);
    }
    return { ...vertices, pre, post, synapses };
  } finally {
    file.close();
  }
}
