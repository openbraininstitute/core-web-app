import { IDENTITY_QUATERNION, unitQuaternion } from '@/features/circuit-nodes/geometry-utils';

import { morphologiesExtent } from '../extent';

import type { CircuitMorphologyData, CircuitSomas, Vec3 } from '../types';
import type { TreeMorphology } from './tree';

/**
 * Soma radius drawn for a cell until its morphology arrives, and for a cell with none, µm. It also bounds what the view
 * frames until then, so it wants to be the order of magnitude of the cells on screen.
 */
export const PLACEHOLDER_SOMA_RADIUS = 8;

/** A small circuit's cells as the page placed them, by which their morphologies are drawn. */
export interface TreeCells {
  somas: CircuitSomas;
  /** Four floats a cell, x, y, z and w of the rotation that turns its morphology into the circuit; null for none. */
  orientations: Float32Array | null;
}

const NO_SOMA = [NaN, NaN, NaN, 0];

const rotationOf = (orientations: Float32Array | null, cell: number): number[] =>
  orientations
    ? unitQuaternion(orientations.subarray(4 * cell, 4 * cell + 4))
    : IDENTITY_QUATERNION;

/** `from`'s three floats at `i`, turned by `q` and moved by `by`, into `to` at `j`. */
function place(
  from: ArrayLike<number>,
  i: number,
  q: number[],
  by: Vec3,
  to: Float32Array,
  j: number
): void {
  const [qx, qy, qz, qw] = q;
  const x = from[i];
  const y = from[i + 1];
  const z = from[i + 2];
  // v + 2w (q × v) + 2 q × (q × v)
  const tx = 2 * (qy * z - qz * y);
  const ty = 2 * (qz * x - qx * z);
  const tz = 2 * (qx * y - qy * x);
  to[j] = x + qw * tx + (qy * tz - qz * ty) + by[0];
  to[j + 1] = y + qw * ty + (qz * tx - qx * tz) + by[1];
  to[j + 2] = z + qw * tz + (qx * ty - qy * tx) + by[2];
}

/**
 * The cells drawn as their morphologies where `trees` has one, each turned and moved to its cell's place, and as a
 * soma `PLACEHOLDER_SOMA_RADIUS` wide at its position where it has none, or none yet; less `centre` throughout. A cell
 * without a position has nothing drawn. The morphologies are kept, not copied.
 */
export function placeTrees(
  { somas: { positions, populations }, orientations }: TreeCells,
  trees: readonly (TreeMorphology | null | undefined)[],
  centre: Vec3
): CircuitMorphologyData {
  const cells = Math.floor(positions.length / 3);
  const placed = (cell: number) =>
    Number.isFinite(positions[3 * cell] + positions[3 * cell + 1] + positions[3 * cell + 2]);
  const morphologies = Array.from({ length: cells }, (_, cell) =>
    placed(cell) ? (trees[cell] ?? null) : null
  );
  let total = 0;
  for (const tree of morphologies) total += tree?.segmentTypes.length ?? 0;

  const segments = new Float32Array(8 * total);
  const segmentCells = new Uint32Array(total);
  const segmentTypes = new Uint8Array(total);
  const somaArray = new Float32Array(4 * cells);
  const firstSegments = new Uint32Array(cells);
  // The dendrograms, where any was charted; a cell with none stands in it as it is.
  const chart = morphologies.some((tree) => tree?.chart)
    ? { segments: new Float32Array(8 * total), somas: new Float32Array(4 * cells) }
    : undefined;
  let first = 0;
  const by: Vec3 = [0, 0, 0];
  for (let cell = 0; cell < cells; cell++) {
    firstSegments[cell] = first;
    const tree = morphologies[cell];
    for (let k = 0; k < 3; k++) by[k] = positions[3 * cell + k] - centre[k];
    const q = tree ? rotationOf(orientations, cell) : IDENTITY_QUATERNION;
    const soma = 4 * cell;
    if (!placed(cell) || (tree && !tree.soma)) {
      somaArray.set(NO_SOMA, soma);
    } else if (tree?.soma) {
      placeSphere(tree.soma, q, by, somaArray, soma);
    } else {
      somaArray.set(by, soma);
      somaArray[soma + 3] = PLACEHOLDER_SOMA_RADIUS;
    }
    if (chart) {
      const ball = tree?.chart?.soma;
      if (ball && tree?.soma) placeSphere(ball, q, by, chart.somas, soma);
      else chart.somas.set(somaArray.subarray(soma, soma + 4), soma);
    }
    if (!tree) continue;
    const count = tree.segmentTypes.length;
    placeSegments(tree.segments, q, by, segments, first);
    if (chart) placeSegments(tree.chart?.segments ?? tree.segments, q, by, chart.segments, first);
    segmentCells.fill(cell, first, first + count);
    segmentTypes.set(tree.segmentTypes, first);
    first += count;
  }

  const data: CircuitMorphologyData = {
    segments,
    segmentCells,
    segmentTypes,
    somas: somaArray,
    populations,
    centre,
    bounds: { min: [0, 0, 0], max: [0, 0, 0] },
    level: { toleranceUm: 0, pruneUm: 0 },
    trees: { morphologies, firstSegments },
    chart,
  };
  // Round both, which the view goes between.
  const extents = [
    morphologiesExtent(data),
    chart && morphologiesExtent({ ...chart, segmentCells }),
  ];
  const found = extents.filter((extent) => extent !== null && extent !== undefined);
  if (found.length > 0) {
    const reach = (side: 'min' | 'max', pick: (...values: number[]) => number) =>
      [0, 1, 2].map((k) => pick(...found.map((extent) => extent[side][k]))) as Vec3;
    data.bounds = { min: reach('min', Math.min), max: reach('max', Math.max) };
  }
  return data;
}

/** A sphere's centre turned and moved, its radius as it is. */
function placeSphere(
  sphere: readonly number[],
  q: number[],
  by: Vec3,
  to: Float32Array,
  at: number
): void {
  place(sphere, 0, q, by, to, at);
  to[at + 3] = sphere[3];
}

/** Segments, eight floats each, turned and moved into `to` from its segment `first` on, their radii as they are. */
function placeSegments(
  from: Float32Array,
  q: number[],
  by: Vec3,
  to: Float32Array,
  first: number
): void {
  for (let s = 0; 8 * s < from.length; s++) {
    const a = 8 * s;
    const b = 8 * (first + s);
    place(from, a, q, by, to, b);
    to[b + 3] = from[a + 3];
    place(from, a + 4, q, by, to, b + 4);
    to[b + 7] = from[a + 7];
  }
}
