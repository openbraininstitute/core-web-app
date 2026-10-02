export type Vec3 = [number, number, number];

/** Positions on a grid, around the mesh's centre: µm = origin + step × value, with one step for all three axes. */
export interface Grid {
  origin: Vec3;
  step: number;
}

/** What the decode worker hands over: the whole mesh, recentred, in µm or on its grid. */
export interface DecodedMesh {
  /** x, y, z per vertex: values on `grid` where it fits 16 bits, else µm around the centre. */
  positions: Uint16Array | Float32Array;
  /** Set exactly when the positions are grid values. */
  grid: Grid | null;
  indices: Uint32Array;
  /** µm around the centre. */
  bounds: { min: Vec3; max: Vec3 };
  /** The bits Draco quantised the positions to; null where it didn't, or the file isn't Draco. */
  dracoBits: number | null;
}

/** A chunk of a packed mesh: its own vertices, at most 65,535, so that its indices fit 16 bits. */
export interface PackedChunk {
  /** x, y, z and an unused w per vertex: grid values from `origin`. */
  positions: Uint16Array;
  /** x, y, z and an unused w per vertex: the unit normal × 127. */
  normals: Int8Array;
  indices: Uint16Array;
  /** The grid values of the chunk's own zero. */
  origin: Vec3;
  /** The chunk's vertices' extent in grid values from `origin`: min x, y, z, then max x, y, z. */
  bounds: [number, number, number, number, number, number];
}

/** A mesh split into chunks and packed for the GPU: 12 bytes a vertex and 2 an index. */
export interface PackedMesh {
  grid: Grid;
  chunks: PackedChunk[];
  triangles: number;
  /** The vertices in all chunks, those on chunk borders counted in each. */
  vertices: number;
  /** The vertices the triangles use, each counted once; missing from stand-ins cached before it was counted. */
  distinctVertices?: number;
}

/** A coarse copy of the mesh, drawn wherever its error is under a pixel. */
export interface StandIn extends PackedMesh {
  /** How far the simplification may have moved the surface, µm. */
  errorUm: number;
}

export interface Timing {
  step: string;
  ms: number;
}
