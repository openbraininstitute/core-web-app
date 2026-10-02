/**
 * The stand-in: a coarse copy of the mesh, drawn wherever its error is under a pixel, and while the view moves on a
 * slow GPU. On Draco's grid it is the mesh clustered on cubes as fine as its triangles allow (`clusterWithin`);
 * otherwise meshoptimizer's sloppy simplifier makes it. It is packed like the full mesh, so that one material draws
 * both.
 */
import { packMesh } from './chunks';
import { clusterWithin } from './cluster';

import type { MeshoptSimplifier } from 'meshoptimizer';
import type { DecodedMesh, StandIn, Timing } from './types';

/**
 * The most triangles a stand-in has, unless the Debug menu sets another: as many as a slow GPU draws while the view
 * moves. A mesh with no more is its own stand-in, whole. The largest cell is clustered on cubes of 0.31 µm.
 */
export const STAND_IN_TRIANGLES = 3_000_000;

export function makeStandIn(
  mesh: DecodedMesh,
  simplifier: typeof MeshoptSimplifier,
  target: number
): { standIn: StandIn; timings: Timing[] } {
  const t0 = performance.now();
  let made: { positions: Uint16Array | Float32Array; indices: Uint32Array; errorUm: number };
  if (mesh.indices.length / 3 <= target) {
    made = { positions: mesh.positions, indices: mesh.indices, errorUm: 0 };
  } else if (mesh.grid && mesh.positions instanceof Uint16Array) {
    const clustered = clusterWithin(mesh.positions, mesh.indices, target);
    made = { ...clustered, errorUm: clustered.moved * mesh.grid.step };
  } else made = sloppy(mesh, simplifier, target);
  const timings: Timing[] = [{ step: 'simplify', ms: performance.now() - t0 }];

  const packed = packMesh(made.positions, mesh.grid, made.indices);
  return {
    standIn: { ...packed.mesh, errorUm: made.errorUm },
    timings: [...timings, ...packed.timings.map((t) => ({ ...t, step: `stand-in ${t.step}` }))],
  };
}

/** Float positions, as from a plain GLB, simplified by meshoptimizer, and only the vertices it keeps. */
function sloppy(mesh: DecodedMesh, simplifier: typeof MeshoptSimplifier, target: number) {
  const floats =
    mesh.positions instanceof Float32Array ? mesh.positions : Float32Array.from(mesh.positions);
  // The simplifier's grid has at most 1,024 cells across the mesh, and that grid alone leaves most meshes under
  // `target`. Asked for every triangle it takes that grid at once, rather than searching for one that fits the target.
  // The error comes back relative to the mesh's extent; a limit of 1 leaves the triangle count to decide.
  const run = (count: number) => simplifier.simplifySloppy(mesh.indices, floats, 3, null, count, 1);
  let [indices, relative] = run(mesh.indices.length);
  if (indices.length / 3 > target) [indices, relative] = run(3 * target);
  const { min, max } = mesh.bounds;
  const errorUm = relative * Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
  // compactMesh renumbers the indices it is given.
  const [remap, unique] = simplifier.compactMesh(indices);
  const positions = new Float32Array(3 * unique);
  for (let v = 0; v < remap.length; v++) {
    const r = remap[v];
    if (r === 0xffffffff) continue;
    positions[3 * r] = floats[3 * v];
    positions[3 * r + 1] = floats[3 * v + 1];
    positions[3 * r + 2] = floats[3 * v + 2];
  }
  return { positions, indices, errorUm };
}
