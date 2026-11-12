/**
 * The skeleton figure's cell, as scripts/learn/skeletonization_data.py wrote it to
 * public/static/learn/skeletonization/: cell.json, which describes the rest; spines.bin, the spines'
 * and the soma's arrays; mesh.glb, the EM cell mesh, read with the EM viewer's own decoder; and
 * skeleton.swc, read with the morphology viewer's own parser. All in µm, around the centre of the
 * mesh's box. Fetched once, and again only if that failed. No three.js here.
 */

import { parseSwc } from '@/features/entities/cell-morphology/morpho-viewer/engine/swc';
import { decodeGlb } from '@/features/entities/em-cell-mesh/viewer/engine/decode';

import type { Morphology } from '@/features/entities/cell-morphology/morpho-viewer/engine/swc';
import type { Vec3 } from './glide';
import type { ShotName } from './view';

export type ArrayType = 'f32' | 'u32' | 'i32' | 'u8';

/** Where an array lies in spines.bin: its type, its offset in bytes, and its length in values. */
export interface ArraySpec {
  type: ArrayType;
  offset: number;
  length: number;
  /** Values per item: 3 for x, y, z. */
  itemSize?: number;
}

export type TypedArray = Float32Array | Uint32Array | Int32Array | Uint8Array;

const ARRAY_TYPES = {
  f32: Float32Array,
  u32: Uint32Array,
  i32: Int32Array,
  u8: Uint8Array,
} as const;

/**
 * Views of `buffer` as `layout` describes them, without copies. The file is little-endian, as
 * typed arrays are on every platform a browser runs on. Throws for an unknown type, an offset not
 * aligned to its type, or an array that runs past the end.
 */
export function readArrays(
  buffer: ArrayBuffer,
  layout: Readonly<Record<string, ArraySpec>>
): Record<string, TypedArray> {
  const out: Record<string, TypedArray> = {};
  for (const [name, { type, offset, length }] of Object.entries(layout)) {
    const Type = ARRAY_TYPES[type];
    if (!Type) throw new Error(`${name}: unknown type "${type}"`);
    if (!Number.isInteger(offset) || !Number.isInteger(length) || offset < 0 || length < 0)
      throw new Error(`${name}: bad offset ${offset} or length ${length}`);
    const bytes = Type.BYTES_PER_ELEMENT;
    if (offset % bytes !== 0) throw new Error(`${name}: offset ${offset} is not ${bytes}-aligned`);
    if (offset + length * bytes > buffer.byteLength)
      throw new Error(`${name}: ends at ${offset + length * bytes}, past ${buffer.byteLength}`);
    out[name] = new Type(buffer, offset, length);
  }
  return out;
}

/** spines.bin's arrays, by cell.json's names. Spine i's items run from its start to the next's. */
export interface SpineArrays {
  /** x, y, z per vertex, placed on the cell. */
  spinePositions: Float32Array;
  /** The same vertices in each spine's own frame: its root at the origin, +y along it. */
  spineLocalPositions: Float32Array;
  /** Three per triangle, into all spines' vertices. */
  spineIndices: Uint32Array;
  spineVertexStart: Uint32Array;
  /** In triangles. */
  spineTriangleStart: Uint32Array;
  /** afferent_surface: where the spine leaves its dendrite, its frame's origin. */
  spineRoot: Float32Array;
  /** afferent_center: the point on the dendrite's axis the spine belongs to. */
  spineCentre: Float32Array;
  /** spine_orientation_vector, a unit vector. */
  spineDirection: Float32Array;
  /** x, y, z, w. */
  spineRotation: Float32Array;
  spineTranslation: Float32Array;
  spineLength: Float32Array;
  /** afferent_section_id: one more than parseSwc's section index here (`sectionIdOffset`). */
  spineSection: Int32Array;
  spineSectionPos: Float32Array;
  /** x, y, z, radius per point of the spines' own skeletons, placed on the cell. */
  spineSkeletonPoints: Float32Array;
  /** Pairs of indices into all spines' skeleton points. */
  spineSkeletonSegments: Uint32Array;
  spineSkeletonPointStart: Uint32Array;
  somaPositions: Float32Array;
  somaIndices: Uint32Array;
}

const SPINE_ARRAYS: Record<keyof SpineArrays, ArrayType> = {
  spinePositions: 'f32',
  spineLocalPositions: 'f32',
  spineIndices: 'u32',
  spineVertexStart: 'u32',
  spineTriangleStart: 'u32',
  spineRoot: 'f32',
  spineCentre: 'f32',
  spineDirection: 'f32',
  spineRotation: 'f32',
  spineTranslation: 'f32',
  spineLength: 'f32',
  spineSection: 'i32',
  spineSectionPos: 'f32',
  spineSkeletonPoints: 'f32',
  spineSkeletonSegments: 'u32',
  spineSkeletonPointStart: 'u32',
  somaPositions: 'f32',
  somaIndices: 'u32',
};

/** The arrays the figure draws from, each checked to be there and of its type. */
export function spineArrays(all: Readonly<Record<string, TypedArray>>): SpineArrays {
  const out: Partial<Record<keyof SpineArrays, TypedArray>> = {};
  for (const [name, type] of Object.entries(SPINE_ARRAYS) as [keyof SpineArrays, ArrayType][]) {
    const a = all[name];
    if (!(a instanceof ARRAY_TYPES[type])) throw new Error(`spines.bin: no ${type} array ${name}`);
    out[name] = a;
  }
  return out as SpineArrays;
}

export interface Box {
  min: Vec3;
  max: Vec3;
}

/** A camera shot: the sphere its subject fits in, and the way the camera looks at it. */
export interface Shot {
  target: Vec3;
  radius: number;
  /** A unit vector from the target towards the camera. */
  direction: Vec3;
  up: Vec3;
}

/** What the figure reads from cell.json. */
export interface CellInfo {
  name: string;
  bounds: Record<'mesh' | 'skeleton' | 'spines' | 'soma' | 'all', Box>;
  counts: Record<string, number>;
  spineLengthRange: [number, number];
  headNeck: boolean;
  /** parseSwc's (and MorphIO's) section index is afferent_section_id less this. */
  sectionIdOffset: number;
  /** The spines whose frame is turned round: their root, the origin, is nearer their free end. */
  reversedSpines: number[];
  checks: { spinesWithOnePointSkeleton: number[]; spinesWithSkeletonOutsideMesh: number[] };
  shots: Record<ShotName, Shot>;
  /** The spine shown close up, and the afferent_section_id of the dendrite shown. */
  chosen: { spine: number; section: number };
  arrays: Record<string, ArraySpec>;
}

/** The cell, ready to draw. */
export interface LoadedCell {
  info: CellInfo;
  spines: SpineArrays;
  /** The EM mesh, as decodeGlb gives it: µm around its box's centre. */
  membrane: { positions: Float32Array; indices: Uint32Array };
  morphology: Morphology;
}

/** The cell from its four files' contents. */
export function parseCell(
  info: CellInfo,
  bin: ArrayBuffer,
  glb: ArrayBuffer,
  swc: string
): LoadedCell {
  const spines = spineArrays(readArrays(bin, info.arrays));
  const { mesh } = decodeGlb(new Uint8Array(glb), null);
  if (!(mesh.positions instanceof Float32Array) || mesh.grid)
    throw new Error('mesh.glb: expected plain float positions');
  return {
    info,
    spines,
    membrane: { positions: mesh.positions, indices: mesh.indices },
    morphology: parseSwc(swc),
  };
}

const BASE = '/static/learn/skeletonization';

function fetched(name: string): Promise<Response> {
  return fetch(`${BASE}/${name}`).then((r) =>
    r.ok ? r : Promise.reject(new Error(`${name}: ${r.status}`))
  );
}

let cell: Promise<LoadedCell> | null = null;

/** The cell, fetched once a session; fetched again if that failed. */
export function loadCell(): Promise<LoadedCell> {
  cell ??= Promise.all([
    fetched('cell.json').then((r) => r.json() as Promise<CellInfo>),
    fetched('spines.bin').then((r) => r.arrayBuffer()),
    fetched('mesh.glb').then((r) => r.arrayBuffer()),
    fetched('skeleton.swc').then((r) => r.text()),
  ])
    .then(([info, bin, glb, swc]) => parseCell(info, bin, glb, swc))
    .catch((e) => {
      cell = null;
      throw e;
    });
  return cell;
}

/** The index among parseSwc's sections of a spine table's afferent_section_id. */
export function sectionIndex(afferentSectionId: number, offset: number): number {
  return afferentSectionId - offset;
}

/**
 * Each spine vertex's distance along its spine's own axis from the spine's end on its dendrite, µm,
 * and each spine's extent along it. A spine's frame has +y along it (`spineLocalPositions`), so the
 * end on the dendrite is its lowest y; for the spines whose frame is turned round (`reversed`), whose
 * origin lies nearer their free end, it is their highest.
 */
export function distanceAlongSpines(
  local: Float32Array,
  vertexStart: Uint32Array,
  reversed: Iterable<number>
): { distance: Float32Array; extent: Float32Array } {
  const turned = new Set(reversed);
  const n = vertexStart.length - 1;
  const distance = new Float32Array(local.length / 3);
  const extent = new Float32Array(Math.max(0, n));
  for (let i = 0; i < n; i++) {
    let lo = Infinity,
      hi = -Infinity;
    for (let v = vertexStart[i]; v < vertexStart[i + 1]; v++) {
      const y = local[3 * v + 1];
      if (y < lo) lo = y;
      if (y > hi) hi = y;
    }
    if (lo > hi) continue;
    extent[i] = hi - lo;
    for (let v = vertexStart[i]; v < vertexStart[i + 1]; v++) {
      const y = local[3 * v + 1];
      distance[v] = turned.has(i) ? hi - y : y - lo;
    }
  }
  return { distance, extent };
}
