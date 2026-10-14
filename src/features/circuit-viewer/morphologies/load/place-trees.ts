import { morphologiesExtent } from '../extent';

import type { CircuitMorphologyData, CircuitSomas, Vec3 } from '../types';
import type { TreeMorphology } from './tree';

/** A small circuit's cells as the page placed them, by which their morphologies are drawn. */
export interface TreeCells {
  somas: CircuitSomas;
  /** Four floats a cell, x, y, z and w of the rotation that turns its morphology into the circuit; null for none. */
  orientations: Float32Array | null;
  /** The radius of a cell's soma until its morphology is in, or where it has none, µm. */
  placeholderRadius: number;
}

const IDENTITY = [0, 0, 0, 1];
const NO_SOMA = [NaN, NaN, NaN, 0];

/** The cell's rotation, made of unit length; none where it has no length to make. */
function rotationOf(orientations: Float32Array | null, cell: number): number[] {
  if (!orientations) return IDENTITY;
  const q = Array.from(orientations.subarray(4 * cell, 4 * cell + 4));
  const length = Math.hypot(...q);
  return length > 0 && Number.isFinite(length) ? q.map((v) => v / length) : IDENTITY;
}

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
 * soma `placeholderRadius` wide at its position where it has none, or none yet; less `centre` throughout. A cell
 * without a position has nothing drawn. The morphologies are kept, not copied.
 */
export function placeTrees(
  { somas: { positions, populations }, orientations, placeholderRadius }: TreeCells,
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
  let first = 0;
  const by: Vec3 = [0, 0, 0];
  for (let cell = 0; cell < cells; cell++) {
    firstSegments[cell] = first;
    const tree = morphologies[cell];
    for (let k = 0; k < 3; k++) by[k] = positions[3 * cell + k] - centre[k];
    const q = tree ? rotationOf(orientations, cell) : IDENTITY;
    const soma = 4 * cell;
    if (!placed(cell) || (tree && !tree.soma)) {
      somaArray.set(NO_SOMA, soma);
    } else if (tree?.soma) {
      place(tree.soma, 0, q, by, somaArray, soma);
      somaArray[soma + 3] = tree.soma[3];
    } else {
      somaArray.set(by, soma);
      somaArray[soma + 3] = placeholderRadius;
    }
    if (!tree) continue;
    const count = tree.segmentTypes.length;
    for (let s = 0; s < count; s++) {
      const from = 8 * s;
      const to = 8 * (first + s);
      place(tree.segments, from, q, by, segments, to);
      segments[to + 3] = tree.segments[from + 3];
      place(tree.segments, from + 4, q, by, segments, to + 4);
      segments[to + 7] = tree.segments[from + 7];
    }
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
  };
  data.bounds = morphologiesExtent(data) ?? data.bounds;
  return data;
}
