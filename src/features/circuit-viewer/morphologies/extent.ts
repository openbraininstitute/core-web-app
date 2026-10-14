import type { CircuitMorphologyData, Vec3 } from './types';

/**
 * Where the cells of `positions`, three floats a cell, lie: their bounds and their mean, over those with a finite
 * position that `keep` keeps; null where there are none.
 */
export function extentOf(
  positions: Readonly<Float32Array>,
  keep?: (cell: number) => boolean
): { min: Vec3; max: Vec3; mean: Vec3 } | null {
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  const sum = [0, 0, 0];
  let count = 0;
  for (let cell = 0; 3 * cell + 2 < positions.length; cell++) {
    const i = 3 * cell;
    if (!Number.isFinite(positions[i] + positions[i + 1] + positions[i + 2])) continue;
    if (keep && !keep(cell)) continue;
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], positions[i + k]);
      max[k] = Math.max(max[k], positions[i + k]);
      sum[k] += positions[i + k];
    }
    count++;
  }
  if (count === 0) return null;
  return { min, max, mean: sum.map((s) => s / count) as Vec3 };
}

/**
 * Where the morphologies of the cells that `keep` keeps lie, in the data's frame: round their segments' ends and their
 * somas, each as wide as its radius; null where there are none.
 */
export function morphologiesExtent(
  {
    segments,
    segmentCells,
    somas,
  }: Pick<CircuitMorphologyData, 'segments' | 'segmentCells' | 'somas'>,
  keep?: (cell: number) => boolean
): { min: Vec3; max: Vec3 } | null {
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  // Four floats from `i`: a point and its radius.
  const take = (values: Float32Array, i: number) => {
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], values[i + k] - values[i + 3]);
      max[k] = Math.max(max[k], values[i + k] + values[i + 3]);
    }
  };
  for (let segment = 0; segment < segmentCells.length; segment++) {
    if (keep && !keep(segmentCells[segment])) continue;
    take(segments, 8 * segment);
    take(segments, 8 * segment + 4);
  }
  for (let cell = 0; 4 * cell < somas.length; cell++) {
    if (Number.isNaN(somas[4 * cell]) || (keep && !keep(cell))) continue;
    take(somas, 4 * cell);
  }
  return min[0] <= max[0] ? { min, max } : null;
}
