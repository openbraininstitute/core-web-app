/**
 * A mesh split into spatial chunks and packed for the GPU.
 *
 * Each chunk has its own vertices, at most 65,535, so its indices fit 16 bits; the vertices on a border between
 * chunks are duplicated. A vertex is 12 bytes: its position as four 16-bit grid values and its normal as four 8-bit
 * ones, the fourth of each unused (Direct3D 11 has no three-component 16-bit format, and ANGLE on Metal converts any
 * stride that isn't a multiple of 4).
 *
 * The positions are on one grid for the whole mesh, so a duplicated vertex has the same value in every chunk. It is
 * Draco's own grid where that fits 16 bits, and then every chunk has the same origin and matrix. Otherwise a step is
 * chosen so that every chunk spans at most 65,535 steps, and each chunk's origin is on the grid.
 */
import { vertexNormals } from '@/features/viewer-3d/engine/normals';

import type { Grid, PackedChunk, PackedMesh, Timing, Vec3 } from './types';

/** WebGL 2 always takes index 65,535 as a primitive restart: a chunk has at most this many vertices, 0 to 65,534. */
export const MAX_CHUNK_VERTICES = 65535;
/** About what the vertex cap allows on a closed surface, which has twice as many triangles as vertices. */
const MAX_CHUNK_TRIANGLES = 131072;
/** The largest grid value. */
const GRID_MAX = 65535;

type Positions = Uint16Array | Float32Array;

/** Each 10-bit number's bits spread over thirty, two zeros after each. */
const SPREAD = Uint32Array.from({ length: 1024 }, (_, v) => {
  let x = v;
  x = (x | (x << 16)) & 0x030000ff;
  x = (x | (x << 8)) & 0x0300f00f;
  x = (x | (x << 4)) & 0x030c30c3;
  return (x | (x << 2)) & 0x09249249;
});

/**
 * The triangles in chunks: `order` lists them chunk after chunk, and chunk i is `order[starts[i]]` up to
 * `order[starts[i + 1]]`. A range of triangles is split at the octree plane of the highest bit where their centroids'
 * Morton codes differ, until it is within both caps, so the chunks come out compact, and in Morton order.
 */
export function splitChunks(
  positions: Positions,
  indices: Uint32Array,
  maxTriangles = MAX_CHUNK_TRIANGLES,
  maxVertices = MAX_CHUNK_VERTICES
): { order: Uint32Array; starts: number[] } {
  const n = indices.length / 3;
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      const v = positions[i + k];
      if (v < min[k]) min[k] = v;
      if (v > max[k]) max[k] = v;
    }
  }
  // The centroid's coordinates, three times over, to 10 bits across the mesh's longest side: one scale for all three
  // axes, so that the highest bit to differ, where a range is split, is on its longest side.
  const extent = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2], 1e-30);
  const scale = 1023.99 / (3 * extent);
  const [x0, y0, z0] = min.map((v) => 3 * v);
  const order = new Uint32Array(n);
  const keys = new Uint32Array(n);
  for (let t = 0; t < n; t++) {
    const a = 3 * indices[3 * t],
      b = 3 * indices[3 * t + 1],
      c = 3 * indices[3 * t + 2];
    const x = ((positions[a] + positions[b] + positions[c] - x0) * scale) | 0;
    const y = ((positions[a + 1] + positions[b + 1] + positions[c + 1] - y0) * scale) | 0;
    const z = ((positions[a + 2] + positions[b + 2] + positions[c + 2] - z0) * scale) | 0;
    order[t] = t;
    keys[t] = SPREAD[x] | (SPREAD[y] << 1) | (SPREAD[z] << 2);
  }

  const seen = new Int32Array(positions.length / 3).fill(-1);
  let stamp = 0;
  const fits = (lo: number, hi: number): boolean => {
    if (hi - lo > maxTriangles) return false;
    stamp++;
    let count = 0;
    for (let i = lo; i < hi; i++) {
      const t = 3 * order[i];
      for (let k = 0; k < 3; k++) {
        const v = indices[t + k];
        if (seen[v] === stamp) continue;
        seen[v] = stamp;
        if (++count > maxVertices) return false;
      }
    }
    return true;
  };

  const starts: number[] = [];
  const stack: number[] = [0, n];
  while (stack.length > 0) {
    const hi = stack.pop() as number;
    const lo = stack.pop() as number;
    if (lo === hi) continue;
    if (fits(lo, hi)) {
      starts.push(lo);
      continue;
    }
    let diff = 0;
    const first = keys[lo];
    for (let i = lo + 1; i < hi; i++) diff |= keys[i] ^ first;
    let mid: number;
    if (diff === 0) mid = (lo + hi) >>> 1;
    else {
      // The keys agree above this bit: those with it clear go first.
      const bit = 1 << (31 - Math.clz32(diff));
      let i = lo,
        j = hi - 1;
      while (i <= j) {
        if ((keys[i] & bit) === 0) i++;
        else {
          const key = keys[i],
            t = order[i];
          keys[i] = keys[j];
          order[i] = order[j];
          keys[j] = key;
          order[j] = t;
          j--;
        }
      }
      mid = i;
    }
    // The low half on top, so that the chunks come out in order.
    stack.push(mid, hi, lo, mid);
  }
  starts.push(n);
  return { order, starts };
}

/**
 * A grid for float positions on which no chunk spans more than `GRID_MAX` steps, and the largest value on it: where
 * that fits 16 bits too, every chunk can share the grid's origin.
 */
function chooseGrid(positions: Float32Array, chunks: Uint32Array[]): { grid: Grid; top: number } {
  const origin: Vec3 = [Infinity, Infinity, Infinity];
  const end: Vec3 = [-Infinity, -Infinity, -Infinity];
  let extent = 0;
  for (const list of chunks) {
    const lo: Vec3 = [Infinity, Infinity, Infinity];
    const hi: Vec3 = [-Infinity, -Infinity, -Infinity];
    for (const v of list) {
      for (let k = 0; k < 3; k++) {
        const p = positions[3 * v + k];
        if (p < lo[k]) lo[k] = p;
        if (p > hi[k]) hi[k] = p;
      }
    }
    for (let k = 0; k < 3; k++) {
      origin[k] = Math.min(origin[k], lo[k]);
      end[k] = Math.max(end[k], hi[k]);
      extent = Math.max(extent, hi[k] - lo[k]);
    }
  }
  // One step less than the values allow: a chunk's own origin is its lowest value rounded.
  const step = Math.max(extent, 1e-9) / (GRID_MAX - 1);
  const top = Math.max(...[0, 1, 2].map((k) => Math.round((end[k] - origin[k]) / step)));
  return { grid: { origin, step }, top };
}

/**
 * The mesh split and packed. `grid` says what the positions are: values on it, or µm where it is null, and a grid
 * is chosen for them.
 */
export function packMesh(
  positions: Positions,
  grid: Grid | null,
  indices: Uint32Array,
  caps = { triangles: MAX_CHUNK_TRIANGLES, vertices: MAX_CHUNK_VERTICES }
): { mesh: PackedMesh; timings: Timing[] } {
  const timings: Timing[] = [];
  const time = <T>(step: string, run: () => T): T => {
    const t0 = performance.now();
    const result = run();
    timings.push({ step, ms: performance.now() - t0 });
    return result;
  };
  const normals = time('normals', () => vertexNormals(positions, indices));
  const { order, starts } = time('split', () =>
    splitChunks(positions, indices, caps.triangles, caps.vertices)
  );

  return time('pack', () => {
    // Each chunk's vertices, and its triangles' indices into them. A vertex's slot holds its chunk, plus one, and its
    // index in it.
    const slot = new Uint32Array(positions.length / 3);
    const scratch = new Uint32Array(MAX_CHUNK_VERTICES);
    const lists: Uint32Array[] = [];
    const chunkIndices: Uint16Array[] = [];
    for (let c = 0; c + 1 < starts.length; c++) {
      const tag = c + 1;
      const local = new Uint16Array(3 * (starts[c + 1] - starts[c]));
      let count = 0;
      for (let i = starts[c], j = 0; i < starts[c + 1]; i++) {
        const t = 3 * order[i];
        for (let k = 0; k < 3; k++, j++) {
          const v = indices[t + k];
          const s = slot[v];
          if (s >>> 16 === tag) local[j] = s & 0xffff;
          else {
            slot[v] = ((tag << 16) | count) >>> 0;
            scratch[count] = v;
            local[j] = count++;
          }
        }
      }
      lists.push(scratch.slice(0, count));
      chunkIndices.push(local);
    }

    const chosen = grid ? null : chooseGrid(positions as Float32Array, lists);
    const g = grid ?? (chosen as { grid: Grid }).grid;
    const shared = chosen === null || chosen.top <= GRID_MAX;
    let vertices = 0;
    const chunks = lists.map((list, c) => {
      vertices += list.length;
      return packChunk(
        gridValues(positions, list, grid ? null : g, shared),
        list,
        chunkIndices[c],
        normals
      );
    });
    return {
      mesh: { grid: g, chunks, triangles: indices.length / 3, vertices },
      timings,
    };
  });
}

/**
 * The grid values of a chunk's vertices, x, y, z and an unused w, from the chunk's origin: the grid's own where the
 * whole mesh shares it, else the lowest values in the chunk. `onto` is the grid that float positions are rounded to;
 * null where the positions are grid values already.
 */
function gridValues(
  positions: Positions,
  list: Uint32Array,
  onto: Grid | null,
  shared: boolean
): { values: Uint16Array; origin: Vec3 } {
  const values = new Uint16Array(4 * list.length);
  const origin: Vec3 = [0, 0, 0];
  if (!onto) {
    for (let i = 0; i < list.length; i++) {
      const v = 3 * list[i];
      values[4 * i] = positions[v];
      values[4 * i + 1] = positions[v + 1];
      values[4 * i + 2] = positions[v + 2];
    }
    return { values, origin };
  }
  const q = (i: number, k: number) =>
    Math.round((positions[3 * list[i] + k] - onto.origin[k]) / onto.step);
  if (!shared) {
    origin.fill(Infinity);
    for (let i = 0; i < list.length; i++)
      for (let k = 0; k < 3; k++) origin[k] = Math.min(origin[k], q(i, k));
  }
  for (let i = 0; i < list.length; i++)
    for (let k = 0; k < 3; k++) values[4 * i + k] = q(i, k) - origin[k];
  return { values, origin };
}

function packChunk(
  { values, origin }: { values: Uint16Array; origin: Vec3 },
  list: Uint32Array,
  indices: Uint16Array,
  normals: Float32Array
): PackedChunk {
  const bounds: PackedChunk['bounds'] = [Infinity, Infinity, Infinity, 0, 0, 0];
  const n = new Int8Array(4 * list.length);
  for (let i = 0; i < list.length; i++) {
    for (let k = 0; k < 3; k++) {
      const q = values[4 * i + k];
      if (q < bounds[k]) bounds[k] = q;
      if (q > bounds[k + 3]) bounds[k + 3] = q;
    }
    const v = 3 * list[i];
    const x = normals[v],
      y = normals[v + 1],
      z = normals[v + 2];
    const length = Math.sqrt(x * x + y * y + z * z);
    if (length > 0) {
      n[4 * i] = Math.round((127 * x) / length);
      n[4 * i + 1] = Math.round((127 * y) / length);
      n[4 * i + 2] = Math.round((127 * z) / length);
    } else n[4 * i + 2] = 127;
  }
  return { positions: values, normals: n, indices, origin, bounds };
}

/** A packed mesh's arrays, to hand to another thread. */
export function packedBuffers(mesh: PackedMesh): ArrayBuffer[] {
  return mesh.chunks.flatMap((c) => [
    c.positions.buffer,
    c.normals.buffer,
    c.indices.buffer,
  ]) as ArrayBuffer[];
}
