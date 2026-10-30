import type {
  ConnectivityMatrix,
  VertexProperty,
} from '@/features/circuit-nodes/connectivity/connectivity-h5';

/** How the matrix is drawn: its neurons grouped by a property, or one by one in an order. */
export type ConnectivityRequest =
  | { by: 'property'; property: string }
  | {
      by: 'neuron';
      /** A property whose values order the neurons, else their order in the matrix. */
      orderBy: string | null;
      /** The most rows: past it, neurons next to each other in the order share one. */
      maxRows: number;
    };

/** The rows a value of the order takes, both ends included. */
export type RowRun = { label: string; start: number; end: number };

/**
 * The matrix over rows of neurons, the same down as across: what each row
 * holds and, row by row from the presynaptic one, the connections and synapses
 * from one row's neurons to another's.
 */
export type ConnectivityGroups = {
  by: ConnectivityRequest['by'];
  labels: string[];
  sizes: Float64Array;
  connections: Float64Array;
  synapses: Float64Array | null;
  /** Neuron by neuron, in an order: the rows each of its values takes. */
  runs: RowRun[] | null;
  /** Neuron by neuron, one in each row: its node id. */
  nodeIds: Float64Array | null;
};

/** What a menu needs of a neuron property: its name, and its values where it has a few. */
export type PropertySummary = { name: string; kind: VertexProperty['kind']; values?: string[] };

/** What the matrix is, before it is drawn. */
export type ConnectivitySummary = {
  neurons: number;
  connections: number;
  /** In all, where the matrix counts them. */
  synapses: number | null;
  properties: PropertySummary[];
};

/** Values by their characters, as cortical mtypes are listed: L1, L23, L2, L3, L4, L5, L6. */
function byCharacters(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/** What a neuron with no value of a property is filed under. */
const NO_VALUE = 'None';

/** The values a categorical property takes, in order. */
function valuesInUse(property: Extract<VertexProperty, { kind: 'categorical' }>): string[] {
  const used = new Uint8Array(property.library.length);
  let none = false;
  for (const code of property.codes) {
    if (code < 0) none = true;
    else used[code] = 1;
  }
  const values = property.library.filter((_, code) => used[code]).sort(byCharacters);
  return none ? [...values, NO_VALUE] : values;
}

export function summarizeConnectivity(matrix: ConnectivityMatrix): ConnectivitySummary {
  let synapses: number | null = null;
  if (matrix.synapses) {
    synapses = 0;
    for (const count of matrix.synapses) synapses += count;
  }
  return {
    neurons: matrix.size,
    connections: matrix.pre.length,
    synapses,
    properties: matrix.properties.map((p) =>
      p.kind === 'categorical'
        ? { name: p.name, kind: p.kind, values: valuesInUse(p) }
        : { name: p.name, kind: p.kind }
    ),
  };
}

/** Each neuron's value of a categorical property, as its place among the values in use. */
function rankedValues(property: Extract<VertexProperty, { kind: 'categorical' }>) {
  const values = valuesInUse(property);
  const rankOfCode = property.library.map((value) => values.indexOf(value));
  const none = values.indexOf(NO_VALUE);
  const ranks = Int32Array.from(property.codes, (code) => (code < 0 ? none : rankOfCode[code]));
  return { values, ranks };
}

function categorical(matrix: ConnectivityMatrix, name: string | null) {
  const property = matrix.properties.find((p) => p.name === name);
  return property?.kind === 'categorical' ? property : null;
}

function countRows(rowOf: Int32Array, rows: number): Float64Array {
  const sizes = new Float64Array(rows);
  for (const row of rowOf) sizes[row] += 1;
  return sizes;
}

/**
 * The rows of the matrix: a neuron's row, how many neurons each holds and what
 * it is called. By a property, a row per value; neuron by neuron, a row per
 * neuron in the order asked for, or per run of them past `maxRows`.
 */
function rowsOf(matrix: ConnectivityMatrix, request: ConnectivityRequest) {
  const { size, nodeIds } = matrix;
  if (request.by === 'property') {
    const property = categorical(matrix, request.property);
    if (!property) throw new Error(`The matrix has no property ${request.property} to group by`);
    const { values, ranks } = rankedValues(property);
    return {
      rowOf: ranks,
      sizes: countRows(ranks, values.length),
      labels: values,
      runs: null,
      ids: null,
    };
  }

  const property = categorical(matrix, request.orderBy);
  const ordered = property ? rankedValues(property) : null;
  const order = Array.from({ length: size }, (_, i) => i).sort(
    (a, b) =>
      (ordered ? ordered.ranks[a] - ordered.ranks[b] : 0) || nodeIds[a] - nodeIds[b] || a - b
  );
  const rows = Math.max(1, Math.min(size, request.maxRows));
  const rowOf = new Int32Array(size);
  order.forEach((neuron, rank) => {
    rowOf[neuron] = Math.floor((rank * rows) / size);
  });

  const runs: RowRun[] = [];
  if (ordered) {
    for (const neuron of order) {
      const label = ordered.values[ordered.ranks[neuron]];
      const last = runs.at(-1);
      if (last?.label === label) last.end = rowOf[neuron];
      else runs.push({ label, start: rowOf[neuron], end: rowOf[neuron] });
    }
  }
  const sizes = countRows(rowOf, rows);
  const ids = rows === size ? Float64Array.from(order, (neuron) => nodeIds[neuron]) : null;
  const labels = ids
    ? Array.from(ids, (id) => `Neuron ${id}`)
    : Array.from(sizes, (n) => `${n.toLocaleString()} neurons`);
  return { rowOf, sizes, labels, runs: ordered ? runs : null, ids };
}

/** The matrix as `request` asks for it: its connections and synapses, summed by rows. */
export function groupConnectivity(
  matrix: ConnectivityMatrix,
  request: ConnectivityRequest
): ConnectivityGroups {
  const { rowOf, sizes, labels, runs, ids } = rowsOf(matrix, request);
  const n = labels.length;
  const connections = new Float64Array(n * n);
  const synapses = matrix.synapses ? new Float64Array(n * n) : null;
  const { pre, post, size } = matrix;
  for (let e = 0; e < pre.length; e++) {
    if (pre[e] >= size || post[e] >= size) continue;
    const cell = rowOf[pre[e]] * n + rowOf[post[e]];
    connections[cell] += 1;
    if (synapses && matrix.synapses) synapses[cell] += matrix.synapses[e];
  }
  return { by: request.by, labels, sizes, connections, synapses, runs, nodeIds: ids };
}

/** The pairs of distinct neurons from one row to another: a neuron makes no pair with itself. */
export function possiblePairs(groups: ConnectivityGroups, pre: number, post: number): number {
  const { sizes } = groups;
  return sizes[pre] * sizes[post] - (pre === post ? sizes[pre] : 0);
}

/** The property a matrix is first grouped by: the finest of the usual ones it has. */
export function defaultGrouping(properties: readonly PropertySummary[]): string | null {
  const names = properties.filter((p) => p.kind === 'categorical').map((p) => p.name);
  return (
    ['mtype', 'layer', 'synapse_class', 'etype'].find((n) => names.includes(n)) ?? names[0] ?? null
  );
}
