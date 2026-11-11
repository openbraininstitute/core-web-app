import type { NodeGeometry } from '@/features/circuit-nodes/types';

/** What a node with no orientation column is drawn with: no rotation at all. */
export const IDENTITY_QUATERNION: [x: number, y: number, z: number, w: number] = [0, 0, 0, 1];

/** `q` made of unit length, as a rotation; no rotation where it has no length to make. */
export function unitQuaternion(q: ArrayLike<number>): [x: number, y: number, z: number, w: number] {
  const length = Math.hypot(q[0], q[1], q[2], q[3]);
  if (!(length > 0 && Number.isFinite(length))) return IDENTITY_QUATERNION;
  return [q[0] / length, q[1] / length, q[2] / length, q[3] / length];
}

/** Where a cell sits and how it is turned, which is what puts its morphology in the world. */
export type NodePlacement = {
  center: [x: number, y: number, z: number];
  orientation: [x: number, y: number, z: number, w: number];
};

/**
 * Read one node's position out of the flat geometry arrays.
 *
 * {@link NodeGeometry} is interleaved typed arrays rather than per-node objects
 * so a population of any size crosses the worker boundary as a transferable —
 * which leaves every consumer doing the same stride arithmetic. Doing it here
 * means a change to the layout is a change to this file.
 */
function positionAt(geometry: NodeGeometry, index: number): [x: number, y: number, z: number] {
  const { positions } = geometry;
  return [positions[index * 3], positions[index * 3 + 1], positions[index * 3 + 2]];
}

/**
 * Read one node's placement, or null where the index is not in the population.
 *
 * Null rather than a default placement: a caller asking about a node that isn't
 * drawn — an edge file's `target_node_id` pointing outside the drawn population,
 * say — wants to know that, not to be handed the origin.
 */
export function placementAt(geometry: NodeGeometry, index: number): NodePlacement | null {
  if (index < 0 || index >= geometry.count) return null;

  const { orientations } = geometry;
  return {
    center: positionAt(geometry, index),
    // As the viewer turns the morphology, so that what is placed on it lands on it.
    orientation: orientations
      ? unitQuaternion(orientations.subarray(index * 4, index * 4 + 4))
      : IDENTITY_QUATERNION,
  };
}

/** Mean position of a population's nodes, or null when the population is empty. */
export function centroidOf(geometry: NodeGeometry): [x: number, y: number, z: number] | null {
  const { count, positions } = geometry;
  if (count === 0) return null;

  // Reads the array directly instead of going through `positionAt`, which
  // would allocate a tuple per node.
  let sx = 0;
  let sy = 0;
  let sz = 0;
  for (let i = 0; i < count; i++) {
    sx += positions[i * 3];
    sy += positions[i * 3 + 1];
    sz += positions[i * 3 + 2];
  }
  return [sx / count, sy / count, sz / count];
}
