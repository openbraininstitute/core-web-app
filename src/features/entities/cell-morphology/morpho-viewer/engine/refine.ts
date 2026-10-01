/**
 * Three corrections to a slab's surface that need the field between the grid samples (field.ts).
 *
 * Projection
 * ----------
 * A surface-nets vertex is the mean of its cell's edge crossings, and those come
 * from linear interpolation of a field that is far from linear across a tube a
 * couple of voxels wide. The vertex ends up inside the true surface by an amount
 * that depends on how the tube happens to sit in the grid, up to half a voxel,
 * which shows as notches along thin neurites. `projectVertices` moves every
 * vertex onto F = 1 with a few Newton steps along ∇F and replaces the face
 * normals by -∇F / |∇F|, so a tube that is only a hexagon in section still
 * shades as a round one.
 *
 * Shading
 * -------
 * -∇F has a crease at every skeleton point where the radius changes (field.ts), and the simplifier, which sees
 * positions only, leaves the vertices that remain on either side of it as it happens: a tapering stem comes out in
 * light and dark patches the size of its triangles. `shadeVertices` gives the vertices that are left after the
 * simplification the sampler's shading normal instead. Positions are not touched.
 *
 * Checked simplification
 * ----------------------
 * meshoptimizer works in float32 on positions scaled to the mesh's extent, and its quadric error is a difference of
 * terms of order one. An error bound of a fraction of a voxel on a neuron a millimetre across is, squared, a few
 * hundred times below the rounding of those terms, so on a whole slab the simplifier accepts collapses more or less at
 * random: tubes get pinched shut and triangles end up a voxel or more off the surface, at any voxel size.
 * `simplifyChecked` therefore hands it one cubic cell of the mesh at a time, with positions relative to the cell. The
 * open edges of a cell's triangles are borders and stay locked, so the pieces fit together; a second round over cells
 * shifted by half a cell then takes out the vertices the first round had to keep along its cell walls.
 *
 * That removes nearly all of the damage, not all: the simplifier bounds an area-weighted RMS distance to the planes a
 * vertex has absorbed rather than the largest deviation, and it does not test the link condition, so it can still
 * close a ring of three vertices across a thin tube (two back-to-back triangles, which later collapses shrink into a
 * pinch). Nor does its output always face the way the surface does: now and then it leaves a vertex outside the ring
 * of its neighbours, with one of its triangles turned over (a fold) and still within the error. The result is
 * checked: an edge used twice in the same direction (every edge with more than two triangles has one), every triangle
 * the simplifier made against the surface's normals at its corners, and the same triangles sampled against the field.
 * The raw vertices around a failure are locked and the cells they touch are redone from the raw mesh. A cell's result
 * depends only on its triangles and locks, so the rest of the mesh stays as it was checked, and what was sampled there
 * is not sampled again. Locked regions stay raw and raw triangles always pass, so the locks only grow and the loop
 * ends.
 *
 * A triangle without area passes all three: three vertices on a line, which the simplifier leaves now and then where
 * the middle one is locked. It faces no way and does no harm in itself, but at a slab's seam, where the locked vertices
 * of both slabs are one and the same, each side can lay one over the same three of them, and the stitched mesh then
 * has the two hanging back to back off an edge with four triangles (mesher.ts). Failing it does not help: redone, the
 * cells along a straight seam lay one somewhere else, pass after pass. Such triangles are taken out of the result
 * instead, which changes neither the surface nor the number of triangles: the triangle across the edge between the
 * outer two corners is split at the middle one.
 */

import { MeshoptSimplifier, type SimplifierFlags } from 'meshoptimizer/simplifier';

import { cellKey, cellOfKey } from './segments';

import type { FieldSampler } from './field';

/** Newton steps per vertex. */
export const PROJECT_STEPS = 3;
/** Longest single step and largest total displacement, in voxels. Surface-nets vertices start within half a voxel or so of the surface. */
export const PROJECT_MAX_STEP = 0.5;
export const PROJECT_MAX_MOVE = 0.5;
/** |F - 1| at which a vertex counts as on the surface. */
export const PROJECT_DONE = 1e-3;
export const MIN_GRADIENT2 = 1e-18;
/**
 * Where F has no gradient, outside every band (F = 0) or deeper than the kernel's clamp (F = 3), a check point is off
 * the surface if F is farther than this from 1.
 */
export const NO_GRADIENT_OFF = 0.25;

/**
 * Move the vertices (relative to `center`) onto the isosurface and overwrite `normals` with unit field normals.
 * A vertex where the gradient vanishes keeps its position and its incoming normal. `radii`, when given, receives the
 * radius of the closest section at every vertex's final position: the last sample has it, and `simplifyChecked`
 * would otherwise sample every vertex once more for it. `only`, when given, lists the vertices to do rather than all
 * of them, for the few a projecting backend had to leave (gpu-slab.ts).
 */
export function projectVertices(
  sampler: FieldSampler,
  positions: Float32Array,
  normals: Float32Array,
  center: [number, number, number],
  h: number,
  radii?: Float32Array,
  only?: ArrayLike<number>
): void {
  const maxStep = PROJECT_MAX_STEP * h,
    maxMove = PROJECT_MAX_MOVE * h;
  const count = only !== undefined ? only.length : positions.length / 3;
  for (let n = 0; n < count; n++) {
    const v = 3 * (only !== undefined ? only[n] : n);
    const x0 = positions[v] + center[0],
      y0 = positions[v + 1] + center[1],
      z0 = positions[v + 2] + center[2];
    let x = x0,
      y = y0,
      z = z0;
    let firstOff = 0;
    for (let step = 0; ; step++) {
      sampler.sample(x, y, z);
      const off = sampler.value - 1;
      if (step === 0) firstOff = Math.abs(off);
      const g2 = sampler.gx * sampler.gx + sampler.gy * sampler.gy + sampler.gz * sampler.gz;
      if (step === PROJECT_STEPS || g2 < MIN_GRADIENT2 || Math.abs(off) < PROJECT_DONE) break;
      let k = -off / g2;
      const len = Math.abs(k) * Math.sqrt(g2);
      if (len > maxStep) k *= maxStep / len;
      x += k * sampler.gx;
      y += k * sampler.gy;
      z += k * sampler.gz;
      const mx = x - x0,
        my = y - y0,
        mz = z - z0;
      const move = Math.sqrt(mx * mx + my * my + mz * mz);
      if (move > maxMove) {
        const s = maxMove / move;
        x = x0 + mx * s;
        y = y0 + my * s;
        z = z0 + mz * s;
        step = PROJECT_STEPS - 1;
      }
    }
    if (Math.abs(sampler.value - 1) > firstOff) {
      // The steps made it worse (a saddle between two sheets): stay.
      x = x0;
      y = y0;
      z = z0;
      sampler.sample(x, y, z);
    }
    positions[v] = x - center[0];
    positions[v + 1] = y - center[1];
    positions[v + 2] = z - center[2];
    if (radii !== undefined) radii[v / 3] = sampler.radius;
    const g = Math.sqrt(
      sampler.gx * sampler.gx + sampler.gy * sampler.gy + sampler.gz * sampler.gz
    );
    if (g * g >= MIN_GRADIENT2) {
      normals[v] = -sampler.gx / g;
      normals[v + 1] = -sampler.gy / g;
      normals[v + 2] = -sampler.gz / g;
    }
  }
}

/**
 * Overwrite the normals of the vertices (relative to `center`) with the sampler's shading normals. A vertex that has
 * none keeps the normal it came with.
 */
export function shadeVertices(
  sampler: FieldSampler,
  positions: Float32Array,
  normals: Float32Array,
  center: [number, number, number]
): void {
  for (let v = 0; v < positions.length; v += 3) {
    if (
      !sampler.shade(
        positions[v] + center[0],
        positions[v + 1] + center[1],
        positions[v + 2] + center[2]
      )
    )
      continue;
    normals[v] = sampler.nx;
    normals[v + 1] = sampler.ny;
    normals[v + 2] = sampler.nz;
  }
}

/** Rounds of simplifying and checking before giving up and keeping the raw mesh. */
const MAX_PASSES = 12;
/** From this pass on, whole cells are locked around a failure instead of its surroundings. */
const LOCK_CELLS_FROM_PASS = 6;
/**
 * The simplifier is asked for this fraction of the allowed deviation. Its own measure is an RMS, which a sound
 * collapse exceeds at its worst point.
 */
const SIMPLIFIER_ERROR_FRACTION = 1 / 3;
/** A triangle may never leave the surface by more than this fraction of the local radius, whatever the error: beyond it a tube is being cut. */
export const MAX_RADIUS_FRACTION = 0.5;
/** Spacing of the check points on a triangle, in voxels. */
export const SAMPLE_SPACING = 1;
export const MAX_SAMPLE_DIVISIONS = 12;
/** Raw vertices closer than this (in voxels) to a failed triangle are locked; a voxel more on every further pass. */
const LOCK_PAD = 1.5;
/**
 * The same for a triangle that faces against the surface, which lies on it all the same: 1.5 voxels around it, as for
 * the other failures, add three to seven times the triangles for about as many passes.
 */
const FOLD_LOCK_PAD = 0.5;
/** How a pass marks a triangle that failed, where one that passed has 0: `FOLDED` if it faces against the surface. */
const FAILED = 1,
  FOLDED = 2;
/** What the sampling said about a triangle, where one not sampled yet has 0. */
const ON_SURFACE = 1,
  OFF_SURFACE = 2;
/**
 * Edge of the cells the simplifier sees, as a multiple of its error and within limits in voxels. The squared error
 * relative to the cell must stay well above float32 rounding (6e-8): 1/640 squared is 2.4e-6.
 */
const CELL_PER_ERROR = 640;
const MIN_CELL_VOXELS = 32;
const MAX_CELL_VOXELS = 128;

const NO_ATTRIBUTES = new Float32Array(0);
/**
 * An absolute error, on positions relative to the cell; the open edges of a cell's triangles, and with them a slab's
 * seams, stay where they are.
 */
const SIMPLIFY_FLAGS: SimplifierFlags[] = ['ErrorAbsolute', 'LockBorder'];

export interface CheckedSimplification {
  indices: Uint32Array;
  /** Rounds of simplifying and checking it took. */
  passes: number;
}

/** What the pass loop has to have sampled: the triangles of its output that the simplifier made and nothing has failed yet. */
interface OffSurfaceRequest {
  indices: Uint32Array;
  /** Triangles of `indices`, by number. */
  candidates: Uint32Array;
}

/** A verdict that another device hands back when it could not tell: this side samples that triangle itself. */
export const UNDECIDED = 2;

/**
 * Samples the candidates of a request against the field on another device (gpu-slab.ts). Per candidate: 0 where the
 * triangle stays on the surface, 1 where it leaves it, `UNDECIDED` where it could not tell.
 */
export type OffSurfaceCheck = (
  indices: Uint32Array,
  candidates: Uint32Array
) => Promise<Uint8Array>;

/**
 * Simplify so that no new triangle is farther than `error` (µm) from the isosurface at its check points or faces
 * against the surface; see the file comment. The result indexes the given vertices, as `MeshoptSimplifier.simplify`
 * does. `normals` are the surface's at the vertices, of any length: the field's, as `projectVertices` leaves them.
 * `radii` is the radius of the closest section at every vertex, as `projectVertices` leaves it; without it the
 * vertices are sampled here.
 */
export function simplifyChecked(
  sampler: FieldSampler,
  positions: Float32Array,
  normals: Float32Array,
  indices: Uint32Array,
  center: [number, number, number],
  h: number,
  error: number,
  radii?: Float32Array
): CheckedSimplification {
  const check: Check = { sampler, positions, center, h, tolerance: error };
  const passes = simplifyPasses(sampler, positions, normals, indices, center, h, error, radii);
  for (let step = passes.next(); ; ) {
    if (step.done) return step.value;
    step = passes.next(sampleHere(check, step.value.indices, step.value.candidates));
  }
}

/**
 * `simplifyChecked` with the triangles sampled by `elsewhere` rather than here, apart from those it hands back
 * undecided. It gives what `simplifyChecked` does, up to the verdicts on triangles whose worst check point lies on
 * the tolerance to within the other device's rounding.
 */
export async function simplifyCheckedAsync(
  sampler: FieldSampler,
  positions: Float32Array,
  normals: Float32Array,
  indices: Uint32Array,
  center: [number, number, number],
  h: number,
  error: number,
  radii: Float32Array | undefined,
  elsewhere: OffSurfaceCheck
): Promise<CheckedSimplification> {
  const check: Check = { sampler, positions, center, h, tolerance: error };
  const passes = simplifyPasses(sampler, positions, normals, indices, center, h, error, radii);
  for (let step = passes.next(); ; ) {
    if (step.done) return step.value;
    const { indices: out, candidates } = step.value;
    const verdicts = await elsewhere(out, candidates);
    for (let i = 0; i < candidates.length; i++) {
      if (verdicts[i] !== UNDECIDED) continue;
      const t = 3 * candidates[i];
      verdicts[i] = offSurface(check, out[t], out[t + 1], out[t + 2]) ? 1 : 0;
    }
    step = passes.next(verdicts);
  }
}

/**
 * The rounds of simplifying and checking. It hands out the triangles to sample and takes back a verdict for each,
 * so that the sampling can be done here or on another device.
 */
function* simplifyPasses(
  sampler: FieldSampler,
  positions: Float32Array,
  normals: Float32Array,
  indices: Uint32Array,
  center: [number, number, number],
  h: number,
  error: number,
  radii: Float32Array | undefined
): Generator<OffSurfaceRequest, CheckedSimplification, Uint8Array> {
  const nv = positions.length / 3;
  const raw = new TriangleSet(indices, nv);
  const lock = new Uint8Array(nv);
  const size = Math.min(
    MAX_CELL_VOXELS * h,
    Math.max(MIN_CELL_VOXELS * h, CELL_PER_ERROR * SIMPLIFIER_ERROR_FRACTION * error)
  );
  const scratch = new Int32Array(nv).fill(-1);
  // What a vertex's surroundings may deviate by: the simplifier works to the smallest of these in a cell, so that a
  // generous error does not wreck the thin tubes (and cost passes to find out).
  const allowed = new Float32Array(nv);
  for (let v = 0; v < nv; v++) {
    let radius: number;
    if (radii !== undefined) radius = radii[v];
    else {
      sampler.sample(
        positions[3 * v] + center[0],
        positions[3 * v + 1] + center[1],
        positions[3 * v + 2] + center[2]
      );
      radius = sampler.radius;
    }
    allowed[v] = Math.min(error, MAX_RADIUS_FRACTION * radius);
  }

  // First round: the raw mesh by cells. Second round: the first round's output by cells shifted half a cell, each
  // fed by the (up to) eight first-round cells it overlaps.
  const first = cellsOf(indices, positions, size, 0);
  const firstOut: Uint32Array[] = new Array(first.keys.length);
  const secondOut = new Map<number, Uint32Array>();
  // What the sampling said about the triangles of a second-round cell's piece. A piece that is not redone keeps its
  // triangles, and they keep their verdicts.
  const sampled = new Map<number, Uint8Array>();
  let dirty: Set<number> | null = null;

  for (let pass = 1; pass <= MAX_PASSES; pass++) {
    for (let c = 0; c < first.keys.length; c++) {
      if (dirty !== null && !dirty.has(first.keys[c])) continue;
      firstOut[c] = simplifyCell(indices, first, c, positions, lock, allowed, scratch);
    }
    const merged = concat(firstOut);
    const second = cellsOf(merged, positions, size, 0.5);
    const pieces: Uint32Array[] = new Array(second.keys.length);
    for (let c = 0; c < second.keys.length; c++) {
      const key = second.keys[c];
      let piece = dirty !== null && !feeds(dirty, key) ? secondOut.get(key) : undefined;
      if (piece === undefined) {
        piece = simplifyCell(merged, second, c, positions, lock, allowed, scratch);
        secondOut.set(key, piece);
        sampled.delete(key);
      }
      pieces[c] = piece;
    }
    const out = concat(pieces);
    // The verdicts so far, in the order of `out`. The pieces' records become views of it, so that they take in the
    // verdicts of this pass too.
    const known = new Uint8Array(out.length / 3);
    for (let c = 0, o = 0; c < second.keys.length; c++) {
      const key = second.keys[c],
        n = pieces[c].length / 3;
      const record = sampled.get(key);
      if (record !== undefined) known.set(record, o);
      sampled.set(key, known.subarray(o, o + n));
      o += n;
    }

    const bad = new Uint8Array(out.length / 3);
    let failures = markRepeatedEdges(out, nv, raw, bad);
    failures += markFolds(out, positions, normals, raw, bad);
    // A triangle an earlier pass found off the surface still is.
    for (let t = 0; t < known.length; t++) {
      if (known[t] !== OFF_SURFACE || bad[t] !== 0) continue;
      bad[t] = FAILED;
      failures++;
    }
    const candidates = candidatesOf(out, bad, raw, known);
    const verdicts = yield { indices: out, candidates };
    for (let i = 0; i < candidates.length; i++) {
      known[candidates[i]] = verdicts[i] === 0 ? ON_SURFACE : OFF_SURFACE;
      if (verdicts[i] === 0) continue;
      bad[candidates[i]] = FAILED;
      failures++;
    }
    if (failures === 0) return { indices: takeOutFlat(out, positions, raw), passes: pass };
    const before = lock.slice();
    if (pass < LOCK_CELLS_FROM_PASS) {
      lockAround(positions, out, bad, FAILED, (LOCK_PAD + pass - 1) * h, lock);
      lockAround(positions, out, bad, FOLDED, (FOLD_LOCK_PAD + pass - 1) * h, lock);
    } else lockCells(positions, indices, first, out, bad, size, lock);
    // The first-round cells with a newly locked vertex are redone, and the second-round cells they feed.
    dirty = new Set<number>();
    for (let c = 0; c < first.keys.length; c++) {
      for (let q = first.start[c]; q < first.start[c + 1]; q++) {
        const t = 3 * first.order[q];
        const a = indices[t],
          b = indices[t + 1],
          d = indices[t + 2];
        if (lock[a] !== before[a] || lock[b] !== before[b] || lock[d] !== before[d]) {
          dirty.add(first.keys[c]);
          break;
        }
      }
    }
  }
  return { indices: indices.slice(), passes: MAX_PASSES };
}

/** Triangles grouped by the cubic cell their centroid falls in. */
interface Cells {
  /** `cellKey` of every occupied cell. */
  keys: number[];
  /** The triangles of cell c are order[start[c]] .. order[start[c + 1] - 1]. */
  start: Uint32Array;
  order: Uint32Array;
}

/** Group triangles by cells of `size` µm; `shift` moves the cell grid by that fraction of a cell. */
function cellsOf(
  indices: Uint32Array,
  positions: Float32Array,
  size: number,
  shift: number
): Cells {
  const count = indices.length / 3;
  const ids = new Map<number, number>();
  const keys: number[] = [],
    sizes: number[] = [];
  const cell = new Uint32Array(count);
  const scale = 1 / (3 * size);
  // Triangles come out of the extraction block by block, so a triangle nearly always shares its predecessor's cell.
  let lastKey = NaN,
    lastId = 0;
  for (let t = 0; t < count; t++) {
    const a = 3 * indices[3 * t],
      b = 3 * indices[3 * t + 1],
      c = 3 * indices[3 * t + 2];
    const key = cellKey(
      Math.floor((positions[a] + positions[b] + positions[c]) * scale + shift),
      Math.floor((positions[a + 1] + positions[b + 1] + positions[c + 1]) * scale + shift),
      Math.floor((positions[a + 2] + positions[b + 2] + positions[c + 2]) * scale + shift)
    );
    if (key !== lastKey) {
      let id = ids.get(key);
      if (id === undefined) {
        id = keys.length;
        ids.set(key, id);
        keys.push(key);
        sizes.push(0);
      }
      lastKey = key;
      lastId = id;
    }
    cell[t] = lastId;
    sizes[lastId]++;
  }
  const start = new Uint32Array(keys.length + 1);
  for (let c = 0; c < keys.length; c++) start[c + 1] = start[c] + sizes[c];
  const fill = start.slice(0, keys.length);
  const order = new Uint32Array(count);
  for (let t = 0; t < count; t++) order[fill[cell[t]]++] = t;
  return { keys, start, order };
}

/** Lock every vertex of the (unshifted) cells that a failed triangle has a corner in. */
function lockCells(
  positions: Float32Array,
  indices: Uint32Array,
  cells: Cells,
  out: Uint32Array,
  bad: Uint8Array,
  size: number,
  lock: Uint8Array
): void {
  const failed = new Set<number>();
  for (let t = 0; t < bad.length; t++) {
    if (bad[t] === 0) continue;
    for (let e = 0; e < 3; e++) {
      const v = 3 * out[3 * t + e];
      failed.add(
        cellKey(
          Math.floor(positions[v] / size),
          Math.floor(positions[v + 1] / size),
          Math.floor(positions[v + 2] / size)
        )
      );
    }
  }
  for (let c = 0; c < cells.keys.length; c++) {
    if (!failed.has(cells.keys[c])) continue;
    for (let q = cells.start[c]; q < cells.start[c + 1]; q++) {
      const t = 3 * cells.order[q];
      lock[indices[t]] = lock[indices[t + 1]] = lock[indices[t + 2]] = 1;
    }
  }
}

/** Whether a cell of the shifted grid takes triangles from one of the given cells of the unshifted grid. */
function feeds(cells: Set<number>, shiftedKey: number): boolean {
  // floor(x + 0.5) is floor(x) or floor(x) + 1: the shifted cell i overlaps the cells i - 1 and i on every axis.
  const [i, j, k] = cellOfKey(shiftedKey);
  for (let d = 0; d < 8; d++) {
    if (cells.has(cellKey(i - (d & 1), j - ((d >> 1) & 1), k - ((d >> 2) & 1)))) return true;
  }
  return false;
}

/**
 * Run the simplifier on cell c, with a vertex buffer of its own relative to the cell's corner and an error that suits
 * the cell's most delicate vertex. `scratch` holds -1 for every vertex, before and after.
 */
function simplifyCell(
  indices: Uint32Array,
  cells: Cells,
  c: number,
  positions: Float32Array,
  lock: Uint8Array,
  allowed: Float32Array,
  scratch: Int32Array
): Uint32Array {
  const from = cells.start[c],
    n = cells.start[c + 1] - from;
  const local = new Uint32Array(3 * n);
  const global: number[] = [];
  let x0 = Infinity,
    y0 = Infinity,
    z0 = Infinity,
    least = Infinity;
  for (let q = 0; q < n; q++) {
    const t = 3 * cells.order[from + q];
    for (let e = 0; e < 3; e++) {
      const v = indices[t + e];
      if (scratch[v] < 0) {
        scratch[v] = global.length;
        global.push(v);
        if (positions[3 * v] < x0) x0 = positions[3 * v];
        if (positions[3 * v + 1] < y0) y0 = positions[3 * v + 1];
        if (positions[3 * v + 2] < z0) z0 = positions[3 * v + 2];
        if (allowed[v] < least) least = allowed[v];
      }
      local[3 * q + e] = scratch[v];
    }
  }
  const pos = new Float32Array(3 * global.length),
    locked = new Uint8Array(global.length);
  for (let l = 0; l < global.length; l++) {
    const v = global[l];
    pos[3 * l] = positions[3 * v] - x0;
    pos[3 * l + 1] = positions[3 * v + 1] - y0;
    pos[3 * l + 2] = positions[3 * v + 2] - z0;
    locked[l] = lock[v];
    scratch[v] = -1;
  }
  const target = SIMPLIFIER_ERROR_FRACTION * least;
  const [kept] = MeshoptSimplifier.simplifyWithAttributes(
    local,
    pos,
    3,
    NO_ATTRIBUTES,
    0,
    [],
    locked,
    0,
    target,
    SIMPLIFY_FLAGS
  );
  for (let e = 0; e < kept.length; e++) kept[e] = global[kept[e]];
  return kept;
}

function concat(parts: Uint32Array[]): Uint32Array {
  let n = 0;
  for (const p of parts) n += p.length;
  const out = new Uint32Array(n);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

/** The triangles of a mesh, filed under their smallest vertex, to tell whether a triangle is one of them. */
class TriangleSet {
  private readonly start: Uint32Array;
  /** The two vertices that follow the smallest one, in winding order. */
  private readonly rest: Uint32Array;

  constructor(indices: Uint32Array, vertexCount: number) {
    const start = new Uint32Array(vertexCount + 1);
    this.start = start;
    for (let t = 0; t < indices.length; t += 3)
      start[Math.min(indices[t], indices[t + 1], indices[t + 2]) + 1]++;
    for (let i = 1; i <= vertexCount; i++) start[i] += start[i - 1];
    const fill = start.slice(0, vertexCount);
    const rest = new Uint32Array((2 * indices.length) / 3);
    this.rest = rest;
    for (let t = 0; t < indices.length; t += 3) {
      const a = indices[t],
        b = indices[t + 1],
        c = indices[t + 2];
      const q = 2 * fill[Math.min(a, b, c)]++;
      if (a < b && a < c) {
        rest[q] = b;
        rest[q + 1] = c;
      } else if (b < c) {
        rest[q] = c;
        rest[q + 1] = a;
      } else {
        rest[q] = a;
        rest[q + 1] = b;
      }
    }
  }

  has(a: number, b: number, c: number): boolean {
    let m = a,
      p = b,
      n = c;
    if (b < a && b < c) {
      m = b;
      p = c;
      n = a;
    } else if (c < a && c < b) {
      m = c;
      p = a;
      n = b;
    }
    const rest = this.rest;
    for (let q = 2 * this.start[m], end = 2 * this.start[m + 1]; q < end; q += 2) {
      if (rest[q] === p && rest[q + 1] === n) return true;
    }
    return false;
  }
}

/**
 * Flag the triangles on an edge that is used twice in the same direction. In a consistently wound mesh every edge
 * with more than two triangles has such a pair. Surface nets leave such an edge themselves once in a few million
 * triangles; between raw triangles it is not the simplifier's doing, and locking could not undo it.
 */
function markRepeatedEdges(
  indices: Uint32Array,
  vertexCount: number,
  raw: TriangleSet,
  bad: Uint8Array
): number {
  // Directed edges grouped by their source vertex.
  const start = new Uint32Array(vertexCount + 1);
  for (let e = 0; e < indices.length; e++) start[indices[e] + 1]++;
  for (let i = 1; i <= vertexCount; i++) start[i] += start[i - 1];
  const fill = start.slice(0, vertexCount);
  const to = new Uint32Array(indices.length),
    tri = new Uint32Array(indices.length);
  for (let t = 0; t < indices.length; t += 3) {
    for (let e = 0; e < 3; e++) {
      const q = fill[indices[t + e]]++;
      to[q] = indices[t + ((e + 1) % 3)];
      tri[q] = t / 3;
    }
  }
  const seenBy = new Int32Array(vertexCount).fill(-1);
  const firstTri = new Uint32Array(vertexCount);
  let failures = 0;
  for (let v = 0; v < vertexCount; v++) {
    for (let q = start[v]; q < start[v + 1]; q++) {
      const w = to[q];
      if (seenBy[w] !== v) {
        seenBy[w] = v;
        firstTri[w] = tri[q];
        continue;
      }
      const t1 = tri[q],
        t2 = firstTri[w];
      if (
        raw.has(indices[3 * t1], indices[3 * t1 + 1], indices[3 * t1 + 2]) &&
        raw.has(indices[3 * t2], indices[3 * t2 + 1], indices[3 * t2 + 2])
      )
        continue;
      for (const t of [t1, t2]) {
        if (bad[t] === 0) {
          bad[t] = FAILED;
          failures++;
        }
      }
    }
  }
  return failures;
}

/**
 * Flag the triangles the simplifier made that face against the surface: their normal and the sum of the unit normals
 * at their corners point away from each other. Raw triangles pass, as with the repeated edges.
 */
function markFolds(
  indices: Uint32Array,
  positions: Float32Array,
  normals: Float32Array,
  raw: TriangleSet,
  bad: Uint8Array
): number {
  let failures = 0;
  for (let t = 0; t < bad.length; t++) {
    if (bad[t] !== 0) continue;
    if (
      facing(
        positions,
        normals,
        3 * indices[3 * t],
        3 * indices[3 * t + 1],
        3 * indices[3 * t + 2]
      ) >= 0
    )
      continue;
    if (raw.has(indices[3 * t], indices[3 * t + 1], indices[3 * t + 2])) continue;
    bad[t] = FOLDED;
    failures++;
  }
  return failures;
}

/**
 * Take out the triangles the simplifier made without area, three corners on a line (see the file comment): the
 * triangle across the edge between the outer two is split at the middle one instead. Its two halves are that
 * triangle as it was checked, and the surface stays where it was; of the edges, only the one between the outer
 * corners goes, for one from the middle corner to the third corner of the split triangle. A flat triangle stays where
 * there is no triangle across, where that has no area either, or where the middle corner and that third corner are
 * joined already.
 */
function takeOutFlat(indices: Uint32Array, positions: Float32Array, raw: TriangleSet): Uint32Array {
  const count = indices.length / 3;
  const flat: number[] = [];
  for (let t = 0; t < count; t++) {
    if (
      isFlat(positions, indices, t) &&
      !raw.has(indices[3 * t], indices[3 * t + 1], indices[3 * t + 2])
    )
      flat.push(t);
  }
  if (flat.length === 0) return indices;
  const out = indices.slice();
  const nv = positions.length / 3;
  // The triangle of every directed edge.
  const edges = new Map<number, number>();
  const file = (t: number, on: boolean): void => {
    for (let e = 0; e < 3; e++) {
      const key = out[3 * t + e] * nv + out[3 * t + ((e + 1) % 3)];
      if (on) edges.set(key, t);
      else if (edges.get(key) === t) edges.delete(key);
    }
  };
  for (let t = 0; t < count; t++) file(t, true);
  // The triangle across a flat one can be flat too, until a flat one next to it is gone: go round until none goes.
  for (let gone = true; gone; ) {
    gone = false;
    for (let i = 0; i < flat.length; i++) {
      const t = flat[i];
      if (t < 0) continue;
      const m = middleCorner(positions, out, t);
      if (m < 0) {
        flat[i] = -1;
        continue;
      }
      // The flat triangle runs a → c → b with c in the middle; the one across runs a → b → y.
      const c = out[3 * t + m],
        b = out[3 * t + ((m + 1) % 3)],
        a = out[3 * t + ((m + 2) % 3)];
      const u = edges.get(a * nv + b);
      if (u === undefined || isFlat(positions, out, u)) continue;
      let y = -1;
      for (let e = 0; e < 3; e++)
        if (out[3 * u + e] === a && out[3 * u + ((e + 1) % 3)] === b)
          y = out[3 * u + ((e + 2) % 3)];
      if (y < 0 || edges.has(c * nv + y) || edges.has(y * nv + c)) continue;
      file(t, false);
      file(u, false);
      out[3 * t] = a;
      out[3 * t + 1] = c;
      out[3 * t + 2] = y;
      out[3 * u] = c;
      out[3 * u + 1] = b;
      out[3 * u + 2] = y;
      file(t, true);
      file(u, true);
      flat[i] = -1;
      gone = true;
    }
  }
  return out;
}

/** Whether triangle t has no area: its corners lie on a line. */
function isFlat(positions: Float32Array, indices: Uint32Array, t: number): boolean {
  const a = 3 * indices[3 * t],
    b = 3 * indices[3 * t + 1],
    c = 3 * indices[3 * t + 2];
  const ux = positions[b] - positions[a],
    uy = positions[b + 1] - positions[a + 1],
    uz = positions[b + 2] - positions[a + 2];
  const vx = positions[c] - positions[a],
    vy = positions[c + 1] - positions[a + 1],
    vz = positions[c + 2] - positions[a + 2];
  return uy * vz - uz * vy === 0 && uz * vx - ux * vz === 0 && ux * vy - uy * vx === 0;
}

/** The corner of flat triangle t that lies between the other two: the one across its longest edge. -1 if two corners are in one place. */
function middleCorner(positions: Float32Array, indices: Uint32Array, t: number): number {
  let middle = -1,
    longest = 0;
  for (let e = 0; e < 3; e++) {
    const p = 3 * indices[3 * t + ((e + 1) % 3)],
      q = 3 * indices[3 * t + ((e + 2) % 3)];
    const d =
      (positions[p] - positions[q]) ** 2 +
      (positions[p + 1] - positions[q + 1]) ** 2 +
      (positions[p + 2] - positions[q + 2]) ** 2;
    if (d === 0) return -1;
    if (d > longest) {
      longest = d;
      middle = e;
    }
  }
  return middle;
}

/**
 * How far the triangle with its corners at a, b and c of P faces the way of the normals there, N at the same offsets:
 * the sum of the components of its normal along theirs. Below zero it faces against them.
 */
export function facing(
  P: ArrayLike<number>,
  N: ArrayLike<number>,
  a: number,
  b: number,
  c: number
): number {
  const ux = P[b] - P[a],
    uy = P[b + 1] - P[a + 1],
    uz = P[b + 2] - P[a + 2];
  const vx = P[c] - P[a],
    vy = P[c + 1] - P[a + 1],
    vz = P[c + 2] - P[a + 2];
  const nx = uy * vz - uz * vy,
    ny = uz * vx - ux * vz,
    nz = ux * vy - uy * vx;
  return along(N, a, nx, ny, nz) + along(N, b, nx, ny, nz) + along(N, c, nx, ny, nz);
}

/** The component of (x, y, z) along the normal whose coordinates start at `normals[n]`, 0 if that is zero. */
function along(normals: ArrayLike<number>, n: number, x: number, y: number, z: number): number {
  const nx = normals[n],
    ny = normals[n + 1],
    nz = normals[n + 2];
  const length = Math.sqrt(nx * nx + ny * ny + nz * nz);
  return length > 0 ? (x * nx + y * ny + z * nz) / length : 0;
}

/** What a triangle is checked against. */
interface Check {
  sampler: FieldSampler;
  positions: Float32Array;
  center: [number, number, number];
  h: number;
  /** Largest distance from the isosurface, µm. */
  tolerance: number;
}

/**
 * Whether the triangle leaves the isosurface at one of its check points: a barycentric lattice without its corners
 * (the vertices are on the surface already), plus the centroid where two divisions give the edge midpoints only.
 */
function offSurface(check: Check, a: number, b: number, c: number): boolean {
  const { positions, center } = check;
  const ax = positions[3 * a] + center[0],
    ay = positions[3 * a + 1] + center[1],
    az = positions[3 * a + 2] + center[2];
  const bx = positions[3 * b] + center[0],
    by = positions[3 * b + 1] + center[1],
    bz = positions[3 * b + 2] + center[2];
  const cx = positions[3 * c] + center[0],
    cy = positions[3 * c + 1] + center[1],
    cz = positions[3 * c + 2] + center[2];
  const longest = Math.sqrt(
    Math.max(
      (bx - ax) ** 2 + (by - ay) ** 2 + (bz - az) ** 2,
      (cx - bx) ** 2 + (cy - by) ** 2 + (cz - bz) ** 2,
      (ax - cx) ** 2 + (ay - cy) ** 2 + (az - cz) ** 2
    )
  );
  const n = Math.max(
    2,
    Math.min(MAX_SAMPLE_DIVISIONS, Math.ceil(longest / (SAMPLE_SPACING * check.h)))
  );
  for (let i = 0; i <= n; i++) {
    for (let j = 0; i + j <= n; j++) {
      const k = n - i - j;
      if (i === n || j === n || k === n) continue;
      const wa = i / n,
        wb = j / n,
        wc = k / n;
      if (
        deviation(
          check,
          wa * ax + wb * bx + wc * cx,
          wa * ay + wb * by + wc * cy,
          wa * az + wb * bz + wc * cz
        ) > 1
      )
        return true;
    }
  }
  return (
    n === 2 && deviation(check, (ax + bx + cx) / 3, (ay + by + cy) / 3, (az + bz + cz) / 3) > 1
  );
}

/** Distance of a point from F = 1 over the distance allowed there, by the first-order estimate |F - 1| / |∇F|. */
function deviation(check: Check, x: number, y: number, z: number): number {
  const sampler = check.sampler;
  sampler.sample(x, y, z);
  const off = Math.abs(sampler.value - 1);
  const g2 = sampler.gx * sampler.gx + sampler.gy * sampler.gy + sampler.gz * sampler.gz;
  if (g2 < MIN_GRADIENT2) return off > NO_GRADIENT_OFF ? Infinity : 0;
  return off / Math.sqrt(g2) / Math.min(check.tolerance, MAX_RADIUS_FRACTION * sampler.radius);
}

/**
 * The triangles to sample: those the simplifier made (the raw mesh's pass as they are) that nothing has failed yet and
 * no earlier pass has sampled.
 */
function candidatesOf(
  indices: Uint32Array,
  bad: Uint8Array,
  raw: TriangleSet,
  known: Uint8Array
): Uint32Array {
  const out = new Uint32Array(bad.length);
  let n = 0;
  for (let t = 0; t < bad.length; t++) {
    if (
      bad[t] === 0 &&
      known[t] === 0 &&
      !raw.has(indices[3 * t], indices[3 * t + 1], indices[3 * t + 2])
    )
      out[n++] = t;
  }
  return out.slice(0, n);
}

/** Whether each candidate leaves the isosurface at one of its check points, sampled here. */
function sampleHere(check: Check, indices: Uint32Array, candidates: Uint32Array): Uint8Array {
  const verdicts = new Uint8Array(candidates.length);
  for (let i = 0; i < candidates.length; i++) {
    const t = 3 * candidates[i];
    if (offSurface(check, indices[t], indices[t + 1], indices[t + 2])) verdicts[i] = 1;
  }
  return verdicts;
}

/** Lock every vertex within `pad` (µm) of a triangle that failed as `how`. */
function lockAround(
  positions: Float32Array,
  indices: Uint32Array,
  bad: Uint8Array,
  how: number,
  pad: number,
  lock: Uint8Array
): void {
  if (!bad.includes(how)) return;
  let x0 = Infinity,
    y0 = Infinity,
    z0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  for (let v = 0; v < positions.length; v += 3) {
    if (positions[v] < x0) x0 = positions[v];
    if (positions[v + 1] < y0) y0 = positions[v + 1];
    if (positions[v + 2] < z0) z0 = positions[v + 2];
    if (positions[v] > x1) x1 = positions[v];
    if (positions[v + 1] > y1) y1 = positions[v + 1];
  }
  // Cells of two pads, with a cell of margin below the mesh. A point within a pad of q lies in one of the (up to
  // eight) cells that hold q's corners q ± pad.
  const cell = 2 * pad;
  x0 -= cell;
  y0 -= cell;
  z0 -= cell;
  const nx = Math.floor((x1 - x0) / cell) + 2,
    ny = Math.floor((y1 - y0) / cell) + 2;
  const marked = new Set<number>();
  for (let t = 0; t < bad.length; t++) {
    if (bad[t] !== how) continue;
    const a = 3 * indices[3 * t],
      b = 3 * indices[3 * t + 1],
      c = 3 * indices[3 * t + 2];
    const ax = positions[a],
      ay = positions[a + 1],
      az = positions[a + 2];
    const bx = positions[b],
      by = positions[b + 1],
      bz = positions[b + 2];
    const px = positions[c],
      py = positions[c + 1],
      pz = positions[c + 2];
    const longest = Math.sqrt(
      Math.max(
        (bx - ax) ** 2 + (by - ay) ** 2 + (bz - az) ** 2,
        (px - bx) ** 2 + (py - by) ** 2 + (pz - bz) ** 2,
        (ax - px) ** 2 + (ay - py) ** 2 + (az - pz) ** 2
      )
    );
    const n = Math.max(1, Math.ceil(longest / pad));
    for (let i = 0; i <= n; i++) {
      for (let j = 0; i + j <= n; j++) {
        const u = i / n,
          w = j / n,
          s = (n - i - j) / n;
        const qx = u * ax + w * bx + s * px,
          qy = u * ay + w * by + s * py,
          qz = u * az + w * bz + s * pz;
        for (let d = 0; d < 8; d++) {
          const ci = Math.floor((qx + (d & 1 ? pad : -pad) - x0) / cell);
          const cj = Math.floor((qy + (d & 2 ? pad : -pad) - y0) / cell);
          const ck = Math.floor((qz + (d & 4 ? pad : -pad) - z0) / cell);
          marked.add((ck * ny + cj) * nx + ci);
        }
      }
    }
  }
  for (let v = 0; v < lock.length; v++) {
    if (lock[v] !== 0) continue;
    const ci = Math.floor((positions[3 * v] - x0) / cell);
    const cj = Math.floor((positions[3 * v + 1] - y0) / cell);
    const ck = Math.floor((positions[3 * v + 2] - z0) / cell);
    if (marked.has((ck * ny + cj) * nx + ci)) lock[v] = 1;
  }
}
