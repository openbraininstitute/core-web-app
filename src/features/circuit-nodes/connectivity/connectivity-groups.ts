import type {
  ConnectivityMatrix,
  VertexProperty,
} from '@/features/circuit-nodes/connectivity/connectivity-h5';

/** Places along a side of the matrix, `end` not included. */
export type PlaceSpan = { start: number; end: number };

/** A stretch of a side, drawn as lines (rows or columns) of `step` places each. */
export type SideWindow = PlaceSpan & { step: number };

/** How the matrix is drawn: its neurons grouped by a property, or one by one in an order. */
export type ConnectivityRequest =
  | { by: 'property'; property: string }
  | {
      by: 'neuron';
      /** A property whose values order the neurons, else their order in the matrix. */
      orderBy: string | null;
      /** The most lines a side has: past it, neurons next to each other in the order share one. */
      maxRows: number;
      /** The stretch of each side zoomed to, else all of it. */
      window?: { pre: SideWindow; post: SideWindow };
    };

/** The places a value of the order takes, both ends included. */
export type RowRun = { label: string; start: number; end: number };

/** One side of the matrix, its rows or its columns: what is in view, and what each line holds. */
export type MatrixSide = SideWindow & {
  labels: string[];
  sizes: Float64Array;
  /** The node ids of each line's neurons: line l's run from `offsets[l]` to `offsets[l + 1]`. */
  members: { offsets: Uint32Array; nodeIds: Uint32Array };
};

/**
 * The matrix over lines of neurons: the presynaptic side down and the postsynaptic across, and,
 * row by row, the connections and synapses from each row's neurons to each column's.
 *
 * A side's places are the same whatever is in view, so a zoom moves nothing: a place per value
 * of the property, or per neuron in the order.
 */
export type ConnectivityGroups = {
  by: ConnectivityRequest['by'];
  /** How many places each side has in all. */
  places: number;
  pre: MatrixSide;
  post: MatrixSide;
  connections: Float64Array;
  synapses: Float64Array | null;
  /** Between all the neurons drawn, whether in view or not. */
  totals: { connections: number; synapses: number | null };
  /** Neuron by neuron, in an order: the places each of its values takes. */
  runs: RowRun[] | null;
};

/** A square of the matrix, by the places its row and column take. */
export type PathwaySquare = { pre: PlaceSpan; post: PlaceSpan };

/**
 * A property of the neurons from outside the matrix, such as a column of the node
 * file: its values' library and a code per node id, -1 for none.
 */
export type NodeProperty = {
  name: string;
  library: string[];
  codes: Int32Array;
  ordered?: boolean;
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

/** A neuron's line where it has none: left out of the matrix, or out of view on that side. */
const LEFT_OUT = -2;
const OUT_OF_VIEW = -1;

/** The values a categorical property takes, in order: among the `included` neurons, where given. */
function valuesInUse(
  property: Extract<VertexProperty, { kind: 'categorical' }>,
  included: Uint8Array | null = null
): string[] {
  const used = new Uint8Array(property.library.length);
  let none = false;
  property.codes.forEach((code, neuron) => {
    if (included && !included[neuron]) return;
    if (code < 0) none = true;
    else used[code] = 1;
  });
  const values = property.library.filter((_, code) => used[code]);
  if (!property.ordered) values.sort(byCharacters);
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

/**
 * Each neuron's value of a categorical property, as its place among the values
 * in use; `LEFT_OUT` for a neuron left out.
 */
function rankedValues(
  property: Extract<VertexProperty, { kind: 'categorical' }>,
  included: Uint8Array | null
) {
  const values = valuesInUse(property, included);
  const rankOfCode = property.library.map((value) => values.indexOf(value));
  const none = values.indexOf(NO_VALUE);
  const ranks = Int32Array.from(property.codes, (code, neuron) => {
    if (included && !included[neuron]) return LEFT_OUT;
    return code < 0 ? none : rankOfCode[code];
  });
  return { values, ranks };
}

/** A flag per neuron of the matrix: whether its node id is among `cells`. */
function includedNeurons(matrix: ConnectivityMatrix, cells: ArrayLike<number>): Uint8Array {
  const wanted = new Set(Array.from(cells));
  return Uint8Array.from(matrix.nodeIds, (id) => (wanted.has(id) ? 1 : 0));
}

/** A categorical property of the neurons: from outside the matrix where given one, else its own. */
function categorical(
  matrix: ConnectivityMatrix,
  name: string | null,
  outside: readonly NodeProperty[]
): Extract<VertexProperty, { kind: 'categorical' }> | null {
  const node = outside.find((p) => p.name === name);
  if (node) {
    const { codes } = node;
    return {
      name: node.name,
      kind: 'categorical',
      library: node.library,
      ordered: node.ordered,
      codes: Int32Array.from(matrix.nodeIds, (id) => (id < codes.length ? codes[id] : -1)),
    };
  }
  const property = matrix.properties.find((p) => p.name === name);
  return property?.kind === 'categorical' ? property : null;
}

function countRows(rowOf: Int32Array, rows: number): Float64Array {
  const sizes = new Float64Array(rows);
  for (const row of rowOf) if (row >= 0) sizes[row] += 1;
  return sizes;
}

/**
 * What of a side to draw while it shows `visible`, in its places: lines of as few neurons as
 * `maxRows` lets, lined up on multiples of their size, so a pan moves whole squares.
 */
export function sideWindow(
  visible: readonly [number, number],
  places: number,
  maxRows: number
): SideWindow {
  if (places <= maxRows) return { start: 0, end: places, step: 1 };
  const [low, high] = visible[0] < visible[1] ? visible : [visible[1], visible[0]];
  // A place is drawn half a place either side of its number.
  const from = Math.min(places - 1, Math.max(0, Math.floor(low + 0.5)));
  const to = Math.max(from + 1, Math.min(places, Math.ceil(high + 0.5)));
  const step = Math.ceil((to - from) / maxRows);
  return {
    start: Math.floor(from / step) * step,
    end: Math.min(places, Math.ceil(to / step) * step),
    step,
  };
}

/** The neurons in the order asked for, and the places each value of that order takes. */
function neuronsInOrder(
  matrix: ConnectivityMatrix,
  orderBy: string | null,
  included: Uint8Array | null,
  outside: readonly NodeProperty[]
) {
  const { size, nodeIds } = matrix;
  const property = categorical(matrix, orderBy, outside);
  const ordered = property ? rankedValues(property, included) : null;
  const order = Array.from({ length: size }, (_, i) => i)
    .filter((neuron) => !included || included[neuron])
    .sort(
      (a, b) =>
        (ordered ? ordered.ranks[a] - ordered.ranks[b] : 0) || nodeIds[a] - nodeIds[b] || a - b
    );
  if (!ordered) return { order, runs: null };

  const runs: RowRun[] = [];
  order.forEach((neuron, place) => {
    const label = ordered.values[ordered.ranks[neuron]];
    const last = runs.at(-1);
    if (last?.label === label) last.end = place;
    else runs.push({ label, start: place, end: place });
  });
  return { order, runs };
}

function neuronCount(n: number): string {
  return n === 1 ? '1 neuron' : `${n.toLocaleString()} neurons`;
}

/** A stretch of the order as lines of neurons, whose places run on from one line to the next. */
function neuronSide(window: SideWindow, order: readonly number[], nodeIds: Float64Array) {
  const { start, end, step } = window;
  const count = end - start;
  const lines = Math.ceil(count / step);
  const sizes = Float64Array.from({ length: lines }, (_, line) =>
    Math.min(step, count - line * step)
  );
  const ids = Uint32Array.from({ length: count }, (_, i) => nodeIds[order[start + i]]);
  return {
    ...window,
    labels: step === 1 ? Array.from(ids, (id) => `Neuron ${id}`) : Array.from(sizes, neuronCount),
    sizes,
    members: {
      offsets: Uint32Array.from({ length: lines + 1 }, (_, line) => Math.min(line * step, count)),
      nodeIds: ids,
    },
  };
}

/** Each neuron's line on a side showing `window`, or why it has none. */
function linesOf({ start, end, step }: SideWindow, order: readonly number[], size: number) {
  const lineOf = new Int32Array(size).fill(LEFT_OUT);
  order.forEach((neuron, place) => {
    lineOf[neuron] =
      place >= start && place < end ? Math.floor((place - start) / step) : OUT_OF_VIEW;
  });
  return lineOf;
}

/** The connections and synapses from each row to each column, and between all the neurons drawn. */
function countLines(
  { pre, post, size, synapses: weights }: ConnectivityMatrix,
  rowOf: Int32Array,
  columnOf: Int32Array,
  rows: number,
  columns: number
) {
  const connections = new Float64Array(rows * columns);
  const synapses = weights ? new Float64Array(rows * columns) : null;
  let allConnections = 0;
  let allSynapses = 0;
  for (let e = 0; e < pre.length; e++) {
    if (pre[e] >= size || post[e] >= size) continue;
    const from = rowOf[pre[e]];
    const to = columnOf[post[e]];
    if (from === LEFT_OUT || to === LEFT_OUT) continue;
    allConnections += 1;
    if (weights) allSynapses += weights[e];
    if (from < 0 || to < 0) continue;
    const cell = from * columns + to;
    connections[cell] += 1;
    if (synapses && weights) synapses[cell] += weights[e];
  }
  return {
    connections,
    synapses,
    totals: { connections: allConnections, synapses: weights ? allSynapses : null },
  };
}

/**
 * The matrix as `request` asks for it: its connections and synapses, summed by
 * lines. Given `cells`, node ids, only those neurons and the connections between
 * them are counted. `outside` are properties to group or order by besides the
 * matrix's own.
 */
export function groupConnectivity(
  matrix: ConnectivityMatrix,
  request: ConnectivityRequest,
  cells: ArrayLike<number> | null = null,
  outside: readonly NodeProperty[] = []
): ConnectivityGroups {
  const included = cells ? includedNeurons(matrix, cells) : null;

  if (request.by === 'property') {
    const property = categorical(matrix, request.property, outside);
    if (!property) throw new Error(`The matrix has no property ${request.property} to group by`);
    const { values, ranks } = rankedValues(property, included);
    const n = values.length;
    const sizes = countRows(ranks, n);
    const side: MatrixSide = {
      start: 0,
      end: n,
      step: 1,
      labels: values,
      sizes,
      members: membersOf(ranks, sizes, matrix.nodeIds),
    };
    return {
      by: 'property',
      places: n,
      pre: side,
      post: side,
      runs: null,
      ...countLines(matrix, ranks, ranks, n, n),
    };
  }

  const { order, runs } = neuronsInOrder(matrix, request.orderBy, included, outside);
  const places = order.length;
  const whole = sideWindow([-0.5, places - 0.5], places, request.maxRows);
  const pre = neuronSide(request.window?.pre ?? whole, order, matrix.nodeIds);
  const post = neuronSide(request.window?.post ?? whole, order, matrix.nodeIds);
  return {
    by: 'neuron',
    places,
    pre,
    post,
    runs,
    ...countLines(
      matrix,
      linesOf(pre, order, matrix.size),
      linesOf(post, order, matrix.size),
      pre.labels.length,
      post.labels.length
    ),
  };
}

/** The node ids of each row's neurons, row after row. */
function membersOf(rowOf: Int32Array, sizes: Float64Array, nodeIds: Float64Array) {
  const offsets = new Uint32Array(sizes.length + 1);
  sizes.forEach((size, row) => {
    offsets[row + 1] = offsets[row] + size;
  });
  const ids = new Uint32Array(offsets[sizes.length]);
  const next = offsets.slice(0, sizes.length);
  rowOf.forEach((row, neuron) => {
    if (row >= 0) ids[next[row]++] = nodeIds[neuron];
  });
  return { offsets, nodeIds: ids };
}

/** The node ids of a row's or column's neurons. */
export function lineMembers(side: MatrixSide, line: number): Uint32Array {
  const { offsets, nodeIds } = side.members;
  return nodeIds.subarray(offsets[line], offsets[line + 1]);
}

/** The places a line takes along its side. */
export function lineSpan(side: SideWindow, line: number): PlaceSpan {
  const start = side.start + line * side.step;
  return { start, end: Math.min(start + side.step, side.end) };
}

/** The square a row and column cross at, which stays where it is whatever comes into view. */
export function squareOf(groups: ConnectivityGroups, row: number, column: number): PathwaySquare {
  return { pre: lineSpan(groups.pre, row), post: lineSpan(groups.post, column) };
}

export function sameSquare(a: PathwaySquare, b: PathwaySquare): boolean {
  return (
    a.pre.start === b.pre.start &&
    a.pre.end === b.pre.end &&
    a.post.start === b.post.start &&
    a.post.end === b.post.end
  );
}

/** How many neurons a row and column have in common: a neuron makes no pair with itself. */
function sharedNeurons(groups: ConnectivityGroups, row: number, column: number): number {
  // Each value of a property is one place, however many neurons it holds.
  if (groups.by === 'property') return row === column ? groups.pre.sizes[row] : 0;
  const { pre, post } = squareOf(groups, row, column);
  return Math.max(0, Math.min(pre.end, post.end) - Math.max(pre.start, post.start));
}

/** The pairs of distinct neurons from a row to a column. */
export function possiblePairs(groups: ConnectivityGroups, row: number, column: number): number {
  return groups.pre.sizes[row] * groups.post.sizes[column] - sharedNeurons(groups, row, column);
}

/** The property a matrix is first grouped by: the finest of the usual ones it has. */
export function defaultGrouping(properties: readonly PropertySummary[]): string | null {
  const names = properties.filter((p) => p.kind === 'categorical').map((p) => p.name);
  return (
    ['mtype', 'layer', 'synapse_class', 'etype'].find((n) => names.includes(n)) ?? names[0] ?? null
  );
}

/**
 * Whether an edge population joins a node population to itself, as its name says its ends
 * (`source__target__type`); undefined for a name that does not say.
 */
export function connectsItself(edgePopulation: string, nodePopulation: string) {
  const [source, target, kind] = edgePopulation.split('__');
  return kind === undefined ? undefined : source === nodePopulation && target === nodePopulation;
}

/**
 * Whether a selection of a node population's neurons is of the matrix's: the
 * population at both ends of the edge population, as its name says them
 * (`source__target__type`), else one of as many neurons.
 */
export function selectionApplies({
  edgePopulation,
  nodePopulation,
  rowCount,
  neurons,
}: {
  edgePopulation: string;
  nodePopulation: string;
  rowCount: number;
  neurons: number;
}): boolean {
  return connectsItself(edgePopulation, nodePopulation) ?? rowCount === neurons;
}
