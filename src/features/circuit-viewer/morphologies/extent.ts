import type { Vec3 } from './types';

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
