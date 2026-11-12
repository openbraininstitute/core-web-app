/**
 * What the spiny H5 is read into for the comparison view: the skeleton as tubes, the soma's mesh, and every spine's mesh
 * placed on the cell, all in the file's own frame, µm. Plain arrays, handed from the worker without a copy.
 */

export type Vec3 = [number, number, number];

/** A mesh as the GPU takes it: x, y, z per vertex, a unit normal × 127 per vertex, and three indices per triangle. */
export interface MeshArrays {
  positions: Float32Array;
  normals: Int8Array;
  indices: Uint32Array;
}

/** The skeleton's sections as tubes, and per vertex the section (its row in the file's structure) and its SWC type. */
export interface SkeletonTubes extends MeshArrays {
  sections: Uint16Array;
  types: Uint8Array;
}

/**
 * Every spine's mesh, turned and moved from its own frame onto the cell by its row of the spine table, one after
 * another: spine k's vertices run from `vertexStart[k]` to `vertexStart[k + 1]`. And, per spine, what its row says.
 */
export interface SpineMeshes extends MeshArrays {
  vertexStart: Uint32Array;
  /** afferent_surface: where it leaves its dendrite, x, y, z. */
  root: Float32Array;
  /** spine_orientation_vector, x, y, z. */
  direction: Float32Array;
  /** spine_rotation, x, y, z, w: from the spine's own frame onto the cell, before the move to `root`. */
  rotation: Float32Array;
  /** spine_length, µm. */
  length: Float32Array;
  /** How far along the dendrites from the soma it leaves its dendrite, µm: its section's path distance, and as far
   * along the section as afferent_section_pos says. */
  somaDistance: Float32Array;
  /** afferent_section_id: the soma is 0, as it is the first row of the skeleton's structure. */
  section: Int32Array;
  /** The spine's row in the spine table. */
  row: Uint32Array;
}

export interface SpinyCounts {
  sections: number;
  skeletonPoints: number;
  spines: number;
  spineVertices: number;
  spineTriangles: number;
  somaTriangles: number;
}

/** A spiny morphology, ready to draw. */
export interface SpinyData {
  /** Its name in the file: the key under /morphology, /soma/meshes and /edges. */
  name: string;
  skeleton: SkeletonTubes;
  /** Each section's SWC type, by its row in the skeleton's structure (the soma's first). */
  sectionTypes: Uint8Array;
  /** The sections' points, x, y, z and radius one after another, section k's from `pointStart[k]` to the next's; and
   * each section's parent, -1 for none. */
  sectionPoints: Float32Array;
  pointStart: Uint32Array;
  sectionParent: Int32Array;
  soma: { positions: Float32Array; indices: Uint32Array } | null;
  spines: SpineMeshes;
  /** The skeleton's points' extent. */
  bounds: { min: Vec3; max: Vec3 };
  counts: SpinyCounts;
}

/** Where reading the file has got to. */
export type SpinyStage = 'download' | 'open' | 'skeleton' | 'spines' | 'normals' | 'done';

export interface SpinyProgress {
  stage: SpinyStage;
  /** Bytes for the download; spines for the spines. */
  done: number;
  total: number | null;
}
