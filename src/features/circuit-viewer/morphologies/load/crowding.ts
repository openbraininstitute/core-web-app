import { extentOf } from '../extent';

/** How far around a soma its neighbours crowd it, µm: the somas view's reach. */
export const CROWDING_REACH = 150;
/** The grid's step, a share of the reach, and the most grid cells it may take before its step grows. */
const STEPS_IN_REACH = 3;
export const MAX_GRID_CELLS = 8_000_000;

/**
 * How crowded each soma's neighbourhood is, a byte a cell, 255 for the most crowded: the sum of reach² − d² over the
 * other somas within `reach` of it, as the somas view meant to count it. Null where no soma has another within reach,
 * or none has a position, which leaves every soma as it is drawn before this is known.
 *
 * Counted pair by pair, a dense region is thousands of neighbours a soma and minutes of work. So each soma is shared
 * out among the eight grid cells around it, a grid a third of the reach wide, by how near it is to their centres; the
 * sum is worked out at the centres, from each cell's share and the distance between centres; and each soma reads it
 * back from the same eight cells as it was shared out, less its own share. Positions are three floats a cell; one
 * that is not finite is left at 0.
 */
export function crowding(
  positions: Readonly<Float32Array>,
  reach = CROWDING_REACH
): Uint8Array | null {
  const cells = Math.floor(positions.length / 3);
  const extent = extentOf(positions);
  if (!extent) return null;
  const { min } = extent;
  const { step, sizes, margin } = gridFor(extent, reach);
  const [nx, ny, nz] = sizes;
  const origin = min.map((m) => m - margin * step);
  const at = (x: number, y: number, z: number) => (x * ny + y) * nz + z;
  // The corner `k` of a grid cell, from the cell: bit 0 the next x, bit 1 the next y, bit 2 the next z.
  const next = Array.from({ length: 8 }, (_, k) => at(k & 1, (k >> 1) & 1, k >> 2));

  const corner = new Float64Array(6);
  const counts = new Float32Array(nx * ny * nz);
  for (let cell = 0; cell < cells; cell++) {
    if (!cornerOf(positions, 3 * cell, origin, step, corner)) continue;
    const base = at(corner[0], corner[1], corner[2]);
    for (let k = 0; k < 8; k++) counts[base + next[k]] += share(k, corner);
  }

  const reach2 = reach * reach;
  const span = Math.floor(reach / step);
  const offsets: number[] = [];
  const weights: number[] = [];
  for (let x = -span; x <= span; x++) {
    for (let y = -span; y <= span; y++) {
      for (let z = -span; z <= span; z++) {
        const d2 = (x * x + y * y + z * z) * step * step;
        if (d2 >= reach2) continue;
        offsets.push(at(x, y, z) - at(0, 0, 0));
        weights.push(reach2 - d2);
      }
    }
  }
  // Only where a soma was shared out, which is where one reads.
  const sums = new Float32Array(counts.length);
  for (let index = 0; index < counts.length; index++) {
    if (counts[index] === 0) continue;
    let sum = 0;
    for (let j = 0; j < offsets.length; j++) sum += counts[index + offsets[j]] * weights[j];
    sums[index] = sum;
  }

  const totals = new Float32Array(cells);
  let most = 0;
  for (let cell = 0; cell < cells; cell++) {
    if (!cornerOf(positions, 3 * cell, origin, step, corner)) continue;
    const base = at(corner[0], corner[1], corner[2]);
    let total = 0;
    for (let k = 0; k < 8; k++) total += share(k, corner) * sums[base + next[k]];
    // Its own share read back, at the distances between the cells it was shared among.
    let spread = 0;
    for (let axis = 3; axis < 6; axis++) spread += corner[axis] * (1 - corner[axis]);
    const own = reach2 - 2 * step * step * spread;
    totals[cell] = Math.max(0, total - own);
    most = Math.max(most, totals[cell]);
  }
  if (!(most > 0)) return null;
  const bytes = new Uint8Array(cells);
  for (let cell = 0; cell < cells; cell++) bytes[cell] = Math.round((255 * totals[cell]) / most);
  return bytes;
}

/**
 * The grid the somas between `min` and `max` are shared out on: its step, its cells along each axis, and the cells
 * left round the somas' for the reach, so that no neighbour is looked for outside it. No more than `MAX_GRID_CELLS`.
 */
export function gridFor(
  { min, max }: { min: number[]; max: number[] },
  reach: number
): { step: number; sizes: number[]; margin: number } {
  let step = reach / STEPS_IN_REACH;
  const pad = () => Math.ceil(reach / step) + 1;
  const sizes = () => min.map((m, k) => Math.floor((max[k] - m) / step) + 2 + 2 * pad());
  let grid = sizes();
  const count = () => grid[0] * grid[1] * grid[2];
  // Again till it fits: a flat circuit's thin side, padded, hardly shrinks with a longer step.
  while (count() > MAX_GRID_CELLS) {
    step *= 1.01 * Math.cbrt(count() / MAX_GRID_CELLS);
    grid = sizes();
  }
  return { step, sizes: grid, margin: pad() };
}

const placed = (positions: Readonly<Float32Array>, i: number) =>
  Number.isFinite(positions[i]) &&
  Number.isFinite(positions[i + 1]) &&
  Number.isFinite(positions[i + 2]);

/** The share of a soma the corner `k` of its grid cell takes, from what `cornerOf` wrote. */
const share = (k: number, corner: Float64Array) =>
  (k & 1 ? corner[3] : 1 - corner[3]) *
  (k & 2 ? corner[4] : 1 - corner[4]) *
  (k & 4 ? corner[5] : 1 - corner[5]);

/**
 * Into `into`, the grid cell whose centre is the nearest below the soma at `positions[i]` on each axis, and how far
 * towards the next centre the soma is; false where it has no position.
 */
function cornerOf(
  positions: Readonly<Float32Array>,
  i: number,
  origin: number[],
  step: number,
  into: Float64Array
): boolean {
  if (!placed(positions, i)) return false;
  for (let k = 0; k < 3; k++) {
    // Cells are counted from their centres, half a step in from their corner.
    const g = (positions[i + k] - origin[k]) / step - 0.5;
    into[k] = Math.floor(g);
    into[k + 3] = g - into[k];
  }
  return true;
}
