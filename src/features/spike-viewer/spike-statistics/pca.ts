import { spikesBetween } from '@/features/spike-viewer/spike-trace';

import type { SpikePopulation } from '@/features/spike-viewer/spike-trace';

/**
 * The cells' firing over time as points: each cell's spikes counted in bins
 * across a span are the coordinates of a point, and these are the points'
 * principal components - the directions in which the cells' firing differs
 * most - with each cell's place along each of them.
 */
export type SpikePca = {
  /** The cells, by node index, in the order of the scores. */
  cells: Uint32Array;
  /** Each component's score per cell: where each cell falls along it. */
  scores: Float64Array[];
  /** Each component's share of the variance across the cells, in [0, 1]. */
  explained: number[];
  /** The bins' width, in ms. */
  width: number;
};

/** About this many bins across the span, unless a width is asked for. */
const AUTO_BINS = 100;
/** Past this many a finer bin over a long run is widened to it. */
const MAX_BINS = 2000;
const MAX_ITERATIONS = 200;
const TOLERANCE = 1e-9;

/** 1, 2 or 5 times a power of ten, nearest `target`: a bin width that reads as a number. */
function roundStep(target: number): number {
  const power = 10 ** Math.floor(Math.log10(target));
  const scaled = target / power;
  return (scaled < 1.5 ? 1 : scaled < 3.5 ? 2 : scaled < 7.5 ? 5 : 10) * power;
}

/**
 * The bins across `span`: the width asked for, or a round one, within
 * {@link MAX_BINS}; and how much of a last one the span's end leaves, in ms,
 * or null where the bins fit the span.
 */
export function pcaBins([from, to]: [number, number], binMs: number | null) {
  const length = Math.max(to - from, 1e-6);
  const width = Math.max(binMs ?? roundStep(length / AUTO_BINS), length / MAX_BINS);
  const bins = Math.max(1, Math.ceil(length / width));
  const lastMs = length - (bins - 1) * width;
  return { width, bins, partialMs: lastMs < width * (1 - 1e-9) ? lastMs : null };
}

/**
 * The principal components of `cells`' spike counts in bins across `span`,
 * `components` of them; null with too few cells or bins to find them. Found by
 * orthogonal iteration over the counts as a sparse matrix, centred on the fly,
 * so the silent bins of a large circuit cost nothing.
 *
 * A last bin the span's end cuts short holds fewer spikes for want of time,
 * not of firing, so it is left out, its spikes with it, unless `includePartial`.
 */
export function spikePca(
  spikes: SpikePopulation | undefined,
  cells: Uint32Array,
  rowCount: number,
  span: [number, number],
  binMs: number | null,
  components: number,
  includePartial = false
): SpikePca | null {
  const from = span[0];
  const { width, partialMs, ...all } = pcaBins(span, binMs);
  const dropLast = partialMs !== null && !includePartial && all.bins > 1;
  const bins = dropLast ? all.bins - 1 : all.bins;
  const to = dropLast ? from + bins * width : span[1];
  const n = cells.length;
  const k = Math.min(components, bins, n - 1);
  if (k < components) return null;

  // The counts, a row per cell: its bins with spikes in them, and how many.
  const rowOf = new Int32Array(rowCount).fill(-1);
  cells.forEach((cell, row) => {
    if (cell < rowCount) rowOf[cell] = row;
  });
  const starts = new Uint32Array(n + 1);
  // The spikes are time-sorted, so only the span's are gone over.
  const within = spikes && spikesBetween(spikes, from, to);
  const nodeIds = within?.nodeIds ?? [];
  const timestamps = within?.timestamps ?? [];
  const rowOfSpike = (i: number) => {
    const t = timestamps[i];
    const cell = nodeIds[i];
    if (t < from || t >= to || !(cell >= 0 && cell < rowCount)) return -1;
    return rowOf[cell];
  };
  for (let i = 0; i < nodeIds.length; i++) {
    const row = rowOfSpike(i);
    if (row >= 0) starts[row + 1] += 1;
  }
  for (let row = 0; row < n; row++) starts[row + 1] += starts[row];
  const binOfSpike = new Uint32Array(starts[n]);
  const filled = starts.slice(0, n);
  for (let i = 0; i < nodeIds.length; i++) {
    const row = rowOfSpike(i);
    if (row < 0) continue;
    binOfSpike[filled[row]++] = Math.min(bins - 1, Math.floor((timestamps[i] - from) / width));
  }
  const rowStart = new Uint32Array(n + 1);
  const column = new Uint32Array(starts[n]);
  const count = new Float64Array(starts[n]);
  let entries = 0;
  for (let row = 0; row < n; row++) {
    const own = binOfSpike.subarray(starts[row], starts[row + 1]).sort();
    for (let s = 0; s < own.length; s++) {
      if (s > 0 && own[s] === own[s - 1]) count[entries - 1] += 1;
      else {
        column[entries] = own[s];
        count[entries] = 1;
        entries += 1;
      }
    }
    rowStart[row + 1] = entries;
  }

  // Each bin's mean over the cells, which centring takes off, and the variance there is to explain.
  const mean = new Float64Array(bins);
  let squares = 0;
  for (let e = 0; e < entries; e++) {
    mean[column[e]] += count[e];
    squares += count[e] * count[e];
  }
  let meanSquares = 0;
  for (let j = 0; j < bins; j++) {
    mean[j] /= n;
    meanSquares += mean[j] * mean[j];
  }
  const total = (squares - n * meanSquares) / (n - 1);
  if (!(total > 0)) return null;

  // Scores: the centred counts times each direction, a value per cell.
  const project = (direction: Float64Array, into: Float64Array) => {
    let offset = 0;
    for (let j = 0; j < bins; j++) offset += mean[j] * direction[j];
    for (let row = 0; row < n; row++) {
      let sum = 0;
      for (let e = rowStart[row]; e < rowStart[row + 1]; e++)
        sum += count[e] * direction[column[e]];
      into[row] = sum - offset;
    }
  };
  // The centred counts' transpose times a score, a value per bin.
  const gather = (score: Float64Array, into: Float64Array) => {
    into.fill(0);
    let sum = 0;
    for (let row = 0; row < n; row++) {
      sum += score[row];
      for (let e = rowStart[row]; e < rowStart[row + 1]; e++)
        into[column[e]] += count[e] * score[row];
    }
    for (let j = 0; j < bins; j++) into[j] -= mean[j] * sum;
  };

  // Seeded, so the same cells come out the same way round every time.
  let seed = 12345;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296 - 0.5;
  };
  let directions = Array.from({ length: k }, () => Float64Array.from({ length: bins }, random));
  orthonormalize(directions);
  const scores = Array.from({ length: k }, () => new Float64Array(n));
  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    const next = directions.map(() => new Float64Array(bins));
    for (let c = 0; c < k; c++) {
      project(directions[c], scores[c]);
      gather(scores[c], next[c]);
    }
    orthonormalize(next);
    let change = 0;
    for (let c = 0; c < k; c++) {
      let dot = 0;
      for (let j = 0; j < bins; j++) dot += next[c][j] * directions[c][j];
      change = Math.max(change, 1 - Math.abs(dot));
    }
    directions = next;
    if (change < TOLERANCE) break;
  }

  const explained: number[] = [];
  for (let c = 0; c < k; c++) {
    // Turned so the bin it weighs most comes out positive: the same way round across recomputes.
    let largest = 0;
    for (let j = 0; j < bins; j++) {
      if (Math.abs(directions[c][j]) > Math.abs(largest)) largest = directions[c][j];
    }
    if (largest < 0) for (let j = 0; j < bins; j++) directions[c][j] = -directions[c][j];
    project(directions[c], scores[c]);
    let variance = 0;
    for (let row = 0; row < n; row++) variance += scores[c][row] * scores[c][row];
    explained.push(variance / (n - 1) / total);
  }
  return { cells, scores, explained, width };
}

/**
 * Modified Gram-Schmidt, in place: each direction made unit and at right
 * angles to those before. Twice over, as once leaves some of what it takes off
 * a direction lying near those before; and one with nothing of its own left -
 * cells that vary along fewer directions than asked - starts from an axis.
 */
function orthonormalize(directions: Float64Array[]) {
  const norm = (v: Float64Array) => {
    let sum = 0;
    for (let j = 0; j < v.length; j++) sum += v[j] * v[j];
    return Math.sqrt(sum);
  };
  const takeOff = (v: Float64Array, c: number) => {
    for (let pass = 0; pass < 2; pass++) {
      for (let p = 0; p < c; p++) {
        const u = directions[p];
        let dot = 0;
        for (let j = 0; j < v.length; j++) dot += u[j] * v[j];
        for (let j = 0; j < v.length; j++) v[j] -= dot * u[j];
      }
    }
  };
  for (let c = 0; c < directions.length; c++) {
    const v = directions[c];
    const before = norm(v);
    takeOff(v, c);
    let length = norm(v);
    for (let axis = 0; !(length > before * 1e-9) && axis < v.length; axis++) {
      v.fill(0);
      v[axis] = 1;
      takeOff(v, c);
      length = norm(v);
    }
    for (let j = 0; j < v.length; j++) v[j] /= length || 1;
  }
}

/** A few of the last results per spike data, so a change of grouping alone is not worked out again. */
const cache = new WeakMap<object, Map<string, SpikePca | null>>();
const CACHED = 8;

/** {@link spikePca}, kept for the same spikes, cells, span, bins and components. */
export function cachedSpikePca(
  spikes: SpikePopulation | undefined,
  cells: Uint32Array,
  rowCount: number,
  span: [number, number],
  binMs: number | null,
  components: number,
  includePartial = false
): SpikePca | null {
  if (!spikes) {
    return spikePca(spikes, cells, rowCount, span, binMs, components, includePartial);
  }
  let hash = 2166136261;
  for (let i = 0; i < cells.length; i++) hash = Math.imul(hash ^ cells[i], 16777619) >>> 0;
  const key = `${cells.length}:${hash}:${rowCount}:${span[0]}:${span[1]}:${binMs}:${components}:${includePartial}`;
  const known = cache.get(spikes) ?? new Map<string, SpikePca | null>();
  cache.set(spikes, known);
  if (known.has(key)) return known.get(key) ?? null;
  const pca = spikePca(spikes, cells, rowCount, span, binMs, components, includePartial);
  if (known.size >= CACHED) known.delete(known.keys().next().value as string);
  known.set(key, pca);
  return pca;
}
