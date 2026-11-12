import { MAX_GROUPS } from '@/features/circuit-nodes/connectivity/node-properties';

import type {
  ConnectivityMatrix,
  VertexProperty,
} from '@/features/circuit-nodes/connectivity/connectivity-h5';

/** Places along a side of the matrix, `end` not included. */
export type PlaceSpan = { start: number; end: number };

/** A stretch of a side, drawn as lines (rows or columns) of `step` places each. */
export type SideWindow = PlaceSpan & { step: number };

/**
 * How the matrix is drawn: its neurons grouped by a property, or one by one in an order. `maxRows`
 * is the most lines a side has, past which places next to each other share one, and `window` the
 * stretch of each side zoomed to, else all of it.
 */
export type ConnectivityRequest = {
  maxRows?: number;
  window?: { pre: SideWindow; post: SideWindow };
} & (
  | { by: 'property'; property: string }
  | {
      by: 'neuron';
      /** A property whose values order the neurons, else their order in the matrix. */
      orderBy: string | null;
    }
);

/** The places a value of the order takes, both ends included. */
export type RowRun = { label: string; start: number; end: number };

/** One side of the matrix, its rows or its columns: what is in view, and what each line holds. */
export type MatrixSide = SideWindow & {
  labels: string[];
  /** Grouped by a property: the first value each line holds, which its ticks name. */
  firstValues?: string[];
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
  /** Grouped by a property: the neurons in all the places before each, one more than there are. */
  neuronsBefore: Float64Array | null;
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
  const rankOf = new Map(values.map((value, rank) => [value, rank]));
  const rankOfCode = property.library.map((value) => rankOf.get(value) ?? -1);
  const none = rankOf.get(NO_VALUE) ?? -1;
  const ranks = Int32Array.from(property.codes, (code, neuron) => {
    if (included && !included[neuron]) return LEFT_OUT;
    return code < 0 ? none : rankOfCode[code];
  });
  return { values, ranks };
}

/** A flag per neuron of the matrix: whether its node id is among `cells`. */
export function includedNeurons(matrix: ConnectivityMatrix, cells: ArrayLike<number>): Uint8Array {
  let top = -1;
  for (const id of matrix.nodeIds) if (id > top) top = id;
  // A flag per node id, where the ids are not far apart: a set of millions is slow to build.
  if (top <= 4 * matrix.size + 1_000_000) {
    const wanted = new Uint8Array(Math.max(0, top + 1));
    for (let i = 0; i < cells.length; i++) if (cells[i] <= top) wanted[cells[i]] = 1;
    return Uint8Array.from(matrix.nodeIds, (id) => wanted[id] ?? 0);
  }
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
 * What of a side to draw while it shows `visible`, in its places: lines of as few places as
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

export function sameWindow(a: SideWindow, b: SideWindow): boolean {
  return a.start === b.start && a.end === b.end && a.step === b.step;
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
  const byNodeId = Uint32Array.from({ length: size }, (_, i) => i);
  // As most matrices list them already.
  if (nodeIds.some((id, i) => i > 0 && id < nodeIds[i - 1])) {
    byNodeId.sort((a, b) => nodeIds[a] - nodeIds[b] || a - b);
  }
  const kept = included ? byNodeId.filter((neuron) => included[neuron]) : byNodeId;
  if (!ordered) return { order: kept, runs: null };

  // By value, and within one as they were: a count of each value says where its neurons go.
  const next = new Uint32Array(ordered.values.length + 1);
  for (const neuron of kept) next[ordered.ranks[neuron] + 1] += 1;
  for (let rank = 1; rank < next.length; rank++) next[rank] += next[rank - 1];
  const order = new Uint32Array(kept.length);
  for (const neuron of kept) order[next[ordered.ranks[neuron]]++] = neuron;

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
function neuronSide(window: SideWindow, order: Uint32Array, nodeIds: Float64Array) {
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

/**
 * A stretch of a property's values as lines of values next to each other, with each neuron's line
 * or why it has none. A line of several is named by its first and last value, as the last can be
 * of fewer than the rest.
 */
function valueSide(
  window: SideWindow,
  values: readonly string[],
  ranks: Int32Array,
  nodeIds: Float64Array
): { side: MatrixSide; lineOf: Int32Array } {
  const { start, end, step } = window;
  const lines = Math.ceil((end - start) / step);
  const lineOf = Int32Array.from(ranks, (rank) => {
    if (rank < 0) return rank;
    return rank >= start && rank < end ? Math.floor((rank - start) / step) : OUT_OF_VIEW;
  });
  const sizes = countRows(lineOf, lines);
  const firstValues = Array.from({ length: lines }, (_, line) => values[start + line * step]);
  const labels = firstValues.map((first, line) => {
    const last = values[Math.min(start + (line + 1) * step, end) - 1];
    return last === first ? first : `${first} – ${last}`;
  });
  return {
    side: { ...window, labels, firstValues, sizes, members: membersOf(lineOf, sizes, nodeIds) },
    lineOf,
  };
}

/** Each neuron's line on a side showing `window`, or why it has none. */
function linesOf({ start, end, step }: SideWindow, order: Uint32Array, size: number) {
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
 * What of a request stays as it is whatever is in view: the values and each neuron's, or the
 * neurons in their order. Worked out once, and counted over for each stretch zoomed to.
 */
export type ConnectivityLayout =
  | { by: 'property'; values: string[]; ranks: Int32Array; neuronsBefore: Float64Array }
  | { by: 'neuron'; order: Uint32Array; runs: RowRun[] | null };

/** The layout `request` asks for, of the `included` neurons where given, whatever its window. */
export function layOutConnectivity(
  matrix: ConnectivityMatrix,
  request: ConnectivityRequest,
  included: Uint8Array | null = null,
  outside: readonly NodeProperty[] = []
): ConnectivityLayout {
  if (request.by === 'neuron') {
    return { by: 'neuron', ...neuronsInOrder(matrix, request.orderBy, included, outside) };
  }
  const property = categorical(matrix, request.property, outside);
  if (!property) throw new Error(`The matrix has no property ${request.property} to group by`);
  const { values, ranks } = rankedValues(property, included);
  const neuronsBefore = new Float64Array(values.length + 1);
  countRows(ranks, values.length).forEach((size, place) => {
    neuronsBefore[place + 1] = neuronsBefore[place] + size;
  });
  return { by: 'property', values, ranks, neuronsBefore };
}

/**
 * The connections and synapses of a layout, summed by the lines of `request`'s window. Nothing
 * of the layout is handed out, so what this returns can go to another thread and the layout stay.
 */
export function countConnectivity(
  matrix: ConnectivityMatrix,
  layout: ConnectivityLayout,
  request: Pick<ConnectivityRequest, 'maxRows' | 'window'>
): ConnectivityGroups {
  const maxRows = request.maxRows ?? Number.POSITIVE_INFINITY;

  if (layout.by === 'property') {
    const { values, ranks } = layout;
    const places = values.length;
    const whole = sideWindow([-0.5, places - 0.5], places, maxRows);
    const pre = valueSide(request.window?.pre ?? whole, values, ranks, matrix.nodeIds);
    const post =
      request.window && !sameWindow(request.window.pre, request.window.post)
        ? valueSide(request.window.post, values, ranks, matrix.nodeIds)
        : pre;
    return {
      by: 'property',
      places,
      pre: pre.side,
      post: post.side,
      runs: null,
      neuronsBefore: layout.neuronsBefore.slice(),
      ...countLines(
        matrix,
        pre.lineOf,
        post.lineOf,
        pre.side.labels.length,
        post.side.labels.length
      ),
    };
  }

  const { order, runs } = layout;
  const places = order.length;
  const whole = sideWindow([-0.5, places - 0.5], places, maxRows);
  const pre = neuronSide(request.window?.pre ?? whole, order, matrix.nodeIds);
  const post = neuronSide(request.window?.post ?? whole, order, matrix.nodeIds);
  return {
    by: 'neuron',
    places,
    pre,
    post,
    runs,
    neuronsBefore: null,
    ...countLines(
      matrix,
      linesOf(pre, order, matrix.size),
      linesOf(post, order, matrix.size),
      pre.labels.length,
      post.labels.length
    ),
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
  return countConnectivity(matrix, layOutConnectivity(matrix, request, included, outside), request);
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
  const { pre, post } = squareOf(groups, row, column);
  const from = Math.max(pre.start, post.start);
  const to = Math.min(pre.end, post.end);
  if (to <= from) return 0;
  // A value of a property is one place, however many neurons it holds; a neuron in an order is one.
  const { neuronsBefore } = groups;
  return neuronsBefore ? neuronsBefore[to] - neuronsBefore[from] : to - from;
}

/** The pairs of distinct neurons from a row to a column. */
export function possiblePairs(groups: ConnectivityGroups, row: number, column: number): number {
  return groups.pre.sizes[row] * groups.post.sizes[column] - sharedNeurons(groups, row, column);
}

/**
 * The property a matrix is first grouped by: the finest of the usual ones with few enough values to
 * read. The 11,752 mtypes of a fly brain would open as rows of 40 values each.
 */
export function defaultGrouping(properties: readonly PropertySummary[]): string | null {
  const names = properties
    .filter((p) => p.kind === 'categorical' && (p.values?.length ?? 0) <= MAX_GROUPS)
    .map((p) => p.name);
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
