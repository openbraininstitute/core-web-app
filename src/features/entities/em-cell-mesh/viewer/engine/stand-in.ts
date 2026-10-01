/**
 * The stand-in: a coarse copy of the mesh, drawn wherever its error is under a pixel. meshoptimizer's sloppy
 * simplifier makes it in about a second from any mesh, packed like the full mesh so that one material draws both.
 */
import { packMesh } from './chunks';

import type { MeshoptSimplifier } from 'meshoptimizer';
import type { DecodedMesh, StandIn, Timing } from './types';

/** About a pixel of error at overview zoom on the largest cell, on a screen at twice the CSS resolution. */
export const STAND_IN_TRIANGLES = 1_000_000;

export function makeStandIn(
  mesh: DecodedMesh,
  simplifier: typeof MeshoptSimplifier,
  target: number
): { standIn: StandIn; timings: Timing[] } {
  const timings: Timing[] = [];
  const t0 = performance.now();
  const floats =
    mesh.positions instanceof Float32Array ? mesh.positions : Float32Array.from(mesh.positions);
  let indices = mesh.indices;
  let error = 0;
  if (indices.length / 3 > target) {
    // The error comes back relative to the mesh's extent; a limit of 1 leaves the triangle count to decide.
    const [simplified, relative] = simplifier.simplifySloppy(
      indices,
      floats,
      3,
      null,
      3 * target,
      1
    );
    indices = simplified;
    error = relative * simplifier.getScale(floats, 3) * (mesh.grid?.step ?? 1);
  }
  timings.push({ step: 'simplify', ms: performance.now() - t0 });

  const t1 = performance.now();
  // Only the vertices the stand-in's triangles use; compactMesh renumbers the indices it is given.
  const own = indices === mesh.indices ? indices.slice() : indices;
  const [remap, unique] = simplifier.compactMesh(own);
  const Positions = mesh.positions instanceof Uint16Array ? Uint16Array : Float32Array;
  const positions = new Positions(3 * unique);
  for (let v = 0; v < remap.length; v++) {
    const r = remap[v];
    if (r === 0xffffffff) continue;
    positions[3 * r] = mesh.positions[3 * v];
    positions[3 * r + 1] = mesh.positions[3 * v + 1];
    positions[3 * r + 2] = mesh.positions[3 * v + 2];
  }
  timings.push({ step: 'compact', ms: performance.now() - t1 });

  const packed = packMesh(positions, mesh.grid, own);
  return {
    standIn: { ...packed.mesh, errorUm: error },
    timings: [...timings, ...packed.timings.map((t) => ({ ...t, step: `stand-in ${t.step}` }))],
  };
}
