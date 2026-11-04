/**
 * A spiny morphology's H5 (morph-spines' format, which the skeletonization workflow writes as `<mesh>_with_spines.h5`)
 * read whole into arrays to draw: the skeleton under /morphology/<name> as tubes; the soma's mesh under
 * /soma/meshes/<name>; and every row of the spine table under /edges/<name>, its spine's mesh, stored upright in its own
 * frame under /spines/meshes/<library>, turned by the row's spine_rotation and moved to its afferent_surface. Runs in
 * the worker, on a file h5wasm has open.
 */

import { Dataset, Group } from 'h5wasm';

import {
  normalsInto,
  pathDistances,
  placeVertices,
  type SkeletonSection,
  skeletonTubes,
} from './geometry';

import type { File } from 'h5wasm';
import type { SpineMeshes, SpinyData, SpinyProgress, Vec3 } from './types';

/** How many rows of a spine library's vertices or triangles are read at once. */
const BLOCK_ROWS = 1 << 19;

type Numeric =
  | Float64Array
  | Float32Array
  | Int32Array
  | Uint32Array
  | BigInt64Array
  | BigUint64Array;

function dataset(file: File, path: string): Dataset {
  const d = file.get(path);
  if (!(d instanceof Dataset)) throw new Error(`${path}: not in the file`);
  return d;
}

function group(file: File, path: string): Group {
  const g = file.get(path);
  if (!(g instanceof Group)) throw new Error(`${path}: not in the file`);
  return g;
}

/** Any integer or float array as plain numbers: 64-bit integers are this format's ids and offsets, far below 2⁵³. */
function numbers(values: unknown, path: string): Float64Array {
  if (values instanceof BigInt64Array || values instanceof BigUint64Array) {
    const out = new Float64Array(values.length);
    for (let i = 0; i < values.length; i++) out[i] = Number(values[i]);
    return out;
  }
  if (ArrayBuffer.isView(values)) return Float64Array.from(values as unknown as ArrayLike<number>);
  if (Array.isArray(values)) return Float64Array.from(values, Number);
  if (typeof values === 'number' || typeof values === 'bigint')
    return Float64Array.of(Number(values));
  throw new Error(`${path}: not numbers`);
}

function strings(values: unknown, path: string): string[] {
  if (Array.isArray(values)) return values.map(String);
  if (typeof values === 'string') return [values];
  throw new Error(`${path}: not strings`);
}

/** A 64-bit integer array's low 32 bits, as the indices of a mesh small enough to have them. */
function low32(values: Numeric): Int32Array {
  if (values instanceof BigInt64Array || values instanceof BigUint64Array) {
    const words = new Int32Array(values.buffer, values.byteOffset, 2 * values.length);
    const out = new Int32Array(values.length);
    for (let i = 0; i < values.length; i++) out[i] = words[2 * i];
    return out;
  }
  return Int32Array.from(values as ArrayLike<number>);
}

/**
 * A dataset's rows, read a block at a time as they are asked for in order: the spines of a library are stored one
 * after another, so each block is read once.
 */
class Rows {
  private start = 0;
  private end = 0;
  private data: Numeric | null = null;
  private readonly rows: number;

  constructor(
    private readonly ds: Dataset,
    private readonly width: number
  ) {
    this.rows = Number(ds.shape?.[0] ?? 0);
  }

  /** Rows `a` to `b`, and where row `a` starts in the array handed back. */
  get(a: number, b: number): { values: Numeric; at: number } {
    if (!this.data || a < this.start || b > this.end) {
      this.start = a;
      this.end = Math.min(this.rows, Math.max(b, a + BLOCK_ROWS));
      this.data = this.ds.slice([
        [this.start, this.end],
        [0, this.width],
      ]) as Numeric;
    }
    return { values: this.data, at: (a - this.start) * this.width };
  }
}

/** The single morphology's name: the file's only key under /morphology. */
export function morphologyName(file: File): string {
  const names = group(file, 'morphology').keys();
  if (names.length !== 1) throw new Error(`expected one morphology, found ${names.length}`);
  return names[0];
}

/**
 * The skeleton's sections from MorphIO's H5 layout: `points` (x, y, z, diameter) and `structure` (first point, type,
 * parent), the soma the first row.
 */
export function readSections(file: File, name: string): SkeletonSection[] {
  const pointsPath = `morphology/${name}/points`;
  const points = numbers(dataset(file, pointsPath).value, pointsPath);
  const structurePath = `morphology/${name}/structure`;
  const structure = numbers(dataset(file, structurePath).value, structurePath);
  const count = points.length / 4;
  const sections: SkeletonSection[] = [];
  for (let s = 0; 3 * s < structure.length; s++) {
    const from = structure[3 * s];
    const to = 3 * (s + 1) < structure.length ? structure[3 * (s + 1)] : count;
    const p = new Float64Array(4 * (to - from));
    for (let k = 0; k < to - from; k++) {
      p[4 * k] = points[4 * (from + k)];
      p[4 * k + 1] = points[4 * (from + k) + 1];
      p[4 * k + 2] = points[4 * (from + k) + 2];
      p[4 * k + 3] = points[4 * (from + k) + 3] / 2;
    }
    sections.push({ type: structure[3 * s + 1], parent: structure[3 * s + 2], points: p });
  }
  return sections;
}

/** The skeleton's points' extent. */
function boundsOf(sections: SkeletonSection[]): { min: Vec3; max: Vec3 } {
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const { points } of sections) {
    for (let k = 0; k + 3 < points.length; k += 4) {
      for (let a = 0; a < 3; a++) {
        min[a] = Math.min(min[a], points[k + a]);
        max[a] = Math.max(max[a], points[k + a]);
      }
    }
  }
  return { min, max };
}

function readSoma(file: File, name: string): SpinyData['soma'] {
  const base = `soma/meshes/${name}`;
  if (!file.get(base)) return null;
  const vertices = numbers(dataset(file, `${base}/vertices`).value, `${base}/vertices`);
  const triangles = dataset(file, `${base}/triangles`).value as Numeric;
  return {
    positions: Float32Array.from(vertices),
    indices: Uint32Array.from(low32(triangles)),
  };
}

/** The spine table's columns this view uses. */
interface Table {
  rows: number;
  library: string[];
  spineId: Float64Array;
  rotation: Float64Array[];
  surface: Float64Array[];
  orientation: Float64Array[];
  length: Float64Array;
  section: Float64Array;
  sectionPos: Float64Array;
}

function readTable(file: File, name: string): Table {
  const base = `edges/${name}`;
  const col = (c: string) => numbers(dataset(file, `${base}/${c}`).value, `${base}/${c}`);
  const spineId = col('spine_id');
  const rows = spineId.length;
  const library = strings(
    dataset(file, `${base}/spine_morphology`).value,
    `${base}/spine_morphology`
  );
  return {
    rows,
    library: library.length === rows ? library : Array(rows).fill(library[0]),
    spineId,
    rotation: ['x', 'y', 'z', 'w'].map((a) => col(`spine_rotation_${a}`)),
    surface: ['x', 'y', 'z'].map((a) => col(`afferent_surface_${a}`)),
    orientation: ['x', 'y', 'z'].map((a) => col(`spine_orientation_vector_${a}`)),
    length: col('spine_length'),
    section: col('afferent_section_id'),
    sectionPos: col('afferent_section_pos'),
  };
}

/**
 * Every row's spine, placed: the rows of each library in the order their spines are stored, so that each library's
 * vertices and triangles are read through once.
 */
function readSpines(
  file: File,
  table: Table,
  paths: { start: Float64Array; length: Float64Array },
  progress: (p: SpinyProgress) => void
): SpineMeshes {
  const offsets = new Map<string, { values: Float64Array; width: number }>();
  for (const lib of new Set(table.library)) {
    const path = `spines/meshes/${lib}/offsets`;
    const ds = dataset(file, path);
    offsets.set(lib, { values: numbers(ds.value, path), width: Number(ds.shape?.[1] ?? 2) });
  }
  const span = (row: number) => {
    const { values, width } = offsets.get(table.library[row]) as {
      values: Float64Array;
      width: number;
    };
    const id = table.spineId[row];
    return {
      v0: values[width * id],
      v1: values[width * (id + 1)],
      t0: values[width * id + 1],
      t1: values[width * (id + 1) + 1],
    };
  };
  const order = Array.from({ length: table.rows }, (_, r) => r).sort(
    (a, b) =>
      table.library[a].localeCompare(table.library[b]) || table.spineId[a] - table.spineId[b]
  );
  let vertices = 0;
  let triangles = 0;
  for (const r of order) {
    const { v0, v1, t0, t1 } = span(r);
    vertices += v1 - v0;
    triangles += t1 - t0;
  }
  const n = order.length;
  const positions = new Float32Array(3 * vertices);
  const indices = new Uint32Array(3 * triangles);
  const vertexStart = new Uint32Array(n + 1);
  const triangleStart = new Uint32Array(n + 1);
  const root = new Float32Array(3 * n);
  const direction = new Float32Array(3 * n);
  const rotation = new Float32Array(4 * n);
  const length = new Float32Array(n);
  const somaDistance = new Float32Array(n);
  const section = new Int32Array(n);
  const row = new Uint32Array(n);
  const readers = new Map<string, { vertices: Rows; triangles: Rows }>();
  const readerFor = (lib: string) => {
    let r = readers.get(lib);
    if (!r) {
      r = {
        vertices: new Rows(dataset(file, `spines/meshes/${lib}/vertices`), 3),
        triangles: new Rows(dataset(file, `spines/meshes/${lib}/triangles`), 3),
      };
      readers.clear();
      readers.set(lib, r);
    }
    return r;
  };

  let v = 0;
  let t = 0;
  order.forEach((r, k) => {
    const { v0, v1, t0, t1 } = span(r);
    const reader = readerFor(table.library[r]);
    const verts = reader.vertices.get(v0, v1);
    const q: [number, number, number, number] = [0, 1, 2, 3].map((a) => table.rotation[a][r]) as [
      number,
      number,
      number,
      number,
    ];
    const at: Vec3 = [table.surface[0][r], table.surface[1][r], table.surface[2][r]];
    placeVertices(
      verts.values.subarray(verts.at, verts.at + 3 * (v1 - v0)) as unknown as ArrayLike<number>,
      q,
      at,
      positions,
      v
    );
    const tris = reader.triangles.get(t0, t1);
    const local = low32(tris.values.subarray(tris.at, tris.at + 3 * (t1 - t0)) as Numeric);
    // wound one way out, as the meshes' own winding cannot be trusted: away from the spine's axis, its local +y
    orientOutward(
      local,
      verts.values.subarray(verts.at, verts.at + 3 * (v1 - v0)) as unknown as ArrayLike<number>
    );
    for (let i = 0; i < local.length; i++) indices[3 * t + i] = v + local[i];
    vertexStart[k] = v;
    triangleStart[k] = t;
    root.set(at, 3 * k);
    direction.set(
      [table.orientation[0][r], table.orientation[1][r], table.orientation[2][r]],
      3 * k
    );
    rotation.set(q, 4 * k);
    length[k] = table.length[r];
    section[k] = table.section[r];
    const sec = table.section[r];
    somaDistance[k] =
      sec >= 0 && sec < paths.start.length
        ? paths.start[sec] + Math.min(1, Math.max(0, table.sectionPos[r])) * paths.length[sec]
        : Number.NaN;
    row[k] = r;
    v += v1 - v0;
    t += t1 - t0;
    if (k % 200 === 0) progress({ stage: 'spines', done: k, total: n });
  });
  vertexStart[n] = v;
  triangleStart[n] = t;

  progress({ stage: 'normals', done: 0, total: n });
  const normals = new Int8Array(3 * vertices);
  for (let k = 0; k < n; k++) {
    normalsInto(
      positions,
      indices,
      vertexStart[k],
      vertexStart[k + 1],
      triangleStart[k],
      triangleStart[k + 1],
      normals
    );
    if (k % 500 === 0) progress({ stage: 'normals', done: k, total: n });
  }
  return {
    positions,
    normals,
    indices,
    vertexStart,
    root,
    direction,
    rotation,
    length,
    somaDistance,
    section,
    row,
  };
}

/** The sections' points, one array for all, with where each section's start, and each one's parent. */
function flatSections(sections: SkeletonSection[]) {
  const pointStart = new Uint32Array(sections.length + 1);
  for (let k = 0; k < sections.length; k++)
    pointStart[k + 1] = pointStart[k] + sections[k].points.length / 4;
  const sectionPoints = new Float32Array(4 * pointStart[sections.length]);
  for (const [k, s] of sections.entries()) sectionPoints.set(s.points, 4 * pointStart[k]);
  return { sectionPoints, pointStart, sectionParent: Int32Array.from(sections, (s) => s.parent) };
}

/**
 * A spine's triangles (indices into its own vertices, in its own frame, +y along it) each wound so that it faces away
 * from the spine's axis, short of its ends: one way out for all, so that smooth normals agree. In place.
 */
export function orientOutward(triangles: Int32Array, local: ArrayLike<number>): void {
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 1; i < local.length; i += 3) {
    lo = Math.min(lo, local[i]);
    hi = Math.max(hi, local[i]);
  }
  const inset = Math.min(0.25, 0.25 * (hi - lo));
  const [from, to] = [lo + inset, Math.max(lo + inset, hi - inset)];
  for (let t = 0; t + 2 < triangles.length; t += 3) {
    const [a, b, c] = [3 * triangles[t], 3 * triangles[t + 1], 3 * triangles[t + 2]];
    const ux = local[b] - local[a],
      uy = local[b + 1] - local[a + 1],
      uz = local[b + 2] - local[a + 2];
    const vx = local[c] - local[a],
      vy = local[c + 1] - local[a + 1],
      vz = local[c + 2] - local[a + 2];
    const nx = uy * vz - uz * vy,
      ny = uz * vx - ux * vz,
      nz = ux * vy - uy * vx;
    const cx = (local[a] + local[b] + local[c]) / 3;
    const cy = (local[a + 1] + local[b + 1] + local[c + 1]) / 3;
    const cz = (local[a + 2] + local[b + 2] + local[c + 2]) / 3;
    // from the nearest point of the axis to the triangle's middle: out
    const hy = cy - Math.min(to, Math.max(from, cy));
    if (nx * cx + ny * hy + nz * cz < 0) {
      const swap = triangles[t + 1];
      triangles[t + 1] = triangles[t + 2];
      triangles[t + 2] = swap;
    }
  }
}

/** The whole spiny morphology, in the file's frame. */
export function readSpiny(file: File, progress: (p: SpinyProgress) => void): SpinyData {
  progress({ stage: 'skeleton', done: 0, total: null });
  const name = morphologyName(file);
  const sections = readSections(file, name);
  const skeleton = skeletonTubes(sections);
  const soma = readSoma(file, name);
  const table = readTable(file, name);
  progress({ stage: 'spines', done: 0, total: table.rows });
  const spines = readSpines(file, table, pathDistances(sections), progress);
  return {
    name,
    skeleton,
    sectionTypes: Uint8Array.from(sections, (s) => s.type),
    ...flatSections(sections),
    soma,
    spines,
    bounds: boundsOf(sections),
    counts: {
      sections: sections.length,
      skeletonPoints: sections.reduce((n, s) => n + s.points.length / 4, 0),
      spines: table.rows,
      spineVertices: spines.positions.length / 3,
      spineTriangles: spines.indices.length / 3,
      somaTriangles: (soma?.indices.length ?? 0) / 3,
    },
  };
}

/** The buffers of `data`'s arrays, to hand over from the worker without a copy. */
export function buffersOf(data: SpinyData): ArrayBuffer[] {
  const arrays: ArrayBufferView[] = [
    ...Object.values(data.skeleton),
    data.sectionTypes,
    data.sectionPoints,
    data.pointStart,
    data.sectionParent,
    ...Object.values(data.spines),
    ...(data.soma ? Object.values(data.soma) : []),
  ];
  return [...new Set(arrays.map((a) => a.buffer as ArrayBuffer))];
}
