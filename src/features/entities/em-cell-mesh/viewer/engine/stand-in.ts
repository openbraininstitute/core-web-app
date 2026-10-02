/**
 * The stand-in: a coarse copy of the mesh, drawn wherever its error is under a pixel, and while the view moves on a
 * slow GPU. On Draco's grid it is the mesh clustered on cubes of about half a micron (`clusterOnGrid`); otherwise
 * meshoptimizer's sloppy simplifier makes it. It is packed like the full mesh, so that one material draws both.
 */
import { packMesh } from './chunks';
import { clusterOnGrid } from './cluster';

import type { MeshoptSimplifier } from 'meshoptimizer';
import type { DecodedMesh, StandIn, Timing } from './types';

/** The most triangles a stand-in has: a mesh with no more is its own stand-in, whole. */
export const STAND_IN_TRIANGLES = 1_500_000;
/**
 * The cube a mesh on a grid is clustered on, µm, unless that leaves it over `STAND_IN_TRIANGLES`: no vertex moves
 * much more. On the largest cell, at overview zoom, under a device pixel on a screen at twice the CSS resolution.
 */
export const STAND_IN_CUBE_UM = 0.5;

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
    const { step } = mesh.grid;
    let shift = Math.max(0, Math.round(Math.log2(STAND_IN_CUBE_UM / step)));
    let clustered = clusterOnGrid(mesh.positions, mesh.indices, shift);
    while (clustered.indices.length / 3 > target && shift < 16) {
      clustered = clusterOnGrid(mesh.positions, mesh.indices, ++shift);
    }
    made = { ...clustered, errorUm: clustered.moved * step };
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
