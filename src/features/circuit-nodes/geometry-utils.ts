import type { NodeGeometry } from '@/features/circuit-nodes/types';

/**
 * Read one node's position out of the flat geometry arrays.
 *
 * {@link NodeGeometry} is interleaved typed arrays rather than per-node objects
 * so a population of any size crosses the worker boundary as a transferable —
 * which leaves every consumer doing the same stride arithmetic. Doing it here
 * means a change to the layout is a change to this file.
 */
export function positionAt(
  geometry: NodeGeometry,
  index: number
): [x: number, y: number, z: number] {
  const { positions } = geometry;
  return [positions[index * 3], positions[index * 3 + 1], positions[index * 3 + 2]];
}
